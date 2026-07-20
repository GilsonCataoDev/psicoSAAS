import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { encrypt, safeDecrypt } from '../../common/crypto/encrypt.util'
import { PLAN_LIMITS, KnownPlan, normalizePlan } from '../../common/plans'
import { Subscription } from '../billing/entities/subscription.entity'
import { AiService, NeuropsychAnalysisPayload, NEUROPSYCH_ANALYSIS_PROMPT_VERSION } from '../sessions/ai.service'
import { AiUsage } from '../sessions/entities/ai-usage.entity'
import { NeuropsychAssessment } from './entities/neuropsych-assessment.entity'
import { NeuropsychBatteryItem } from './entities/neuropsych-battery-item.entity'
import { NeuropsychAiAnalysis } from './entities/neuropsych-ai-analysis.entity'
import { parseNeuropsychAnalysis, NeuropsychAnalysisResult } from './neuropsych-analysis.schema'

const ASSESSMENT_CLINICAL_FIELDS = ['referralQuestion', 'clinicalHistory', 'clinicalHypotheses', 'qualitativeObservations'] as const
const COMPED_PRO_EMAILS = (process.env.COMPED_PRO_EMAILS ?? 'gilsonfilho96@outlook.com')
  .split(',')
  .map(email => email.trim().toLowerCase())
  .filter(Boolean)

export type NeuropsychAiAnalysisDto = {
  id: string
  status: string
  result: NeuropsychAnalysisResult
  model: string
  promptVersion: string
  inputTokens: number
  outputTokens: number
  costUsdMicros: number
  includedFields: string[]
  createdAt: Date
}

@Injectable()
export class NeuropsychAiAnalysisService {
  private readonly logger = new Logger(NeuropsychAiAnalysisService.name)

  constructor(
    @InjectRepository(NeuropsychAssessment) private readonly assessments: Repository<NeuropsychAssessment>,
    @InjectRepository(NeuropsychBatteryItem) private readonly items: Repository<NeuropsychBatteryItem>,
    @InjectRepository(NeuropsychAiAnalysis) private readonly analyses: Repository<NeuropsychAiAnalysis>,
    @InjectRepository(AiUsage) private readonly aiUsage: Repository<AiUsage>,
    @InjectRepository(Subscription) private readonly subscriptions: Repository<Subscription>,
    private readonly ai: AiService,
  ) {}

  async getUsage(userId: string, email?: string): Promise<{ used: number; limit: number; month: string }> {
    const plan = await this.getCurrentPlan(userId, email)
    const limit = PLAN_LIMITS[plan].neuropsychAiMonthlyLimit
    const month = this.currentMonth()
    const usage = await this.aiUsage.findOne({ where: { userId, month } })
    return { used: usage?.neuropsychAnalyses ?? 0, limit, month }
  }

  async list(assessmentId: string, psychologistId: string): Promise<NeuropsychAiAnalysisDto[]> {
    await this.assertAssessmentOwner(assessmentId, psychologistId)
    const rows = await this.analyses.find({
      where: { assessmentId, psychologistId },
      order: { createdAt: 'DESC' },
      take: 20,
    })
    return rows.map(row => this.toDto(row)).filter((dto): dto is NeuropsychAiAnalysisDto => dto !== null)
  }

  async generate(
    assessmentId: string,
    fields: string[],
    psychologistId: string,
    email: string | undefined,
  ): Promise<NeuropsychAiAnalysisDto> {
    const assessment = await this.assertAssessmentOwner(assessmentId, psychologistId)
    const plan = await this.getCurrentPlan(psychologistId, email)
    await this.chargeQuota(psychologistId, plan)

    try {
      const payload = await this.buildPayload(assessment, fields)
      const result = await this.ai.generateNeuropsychAnalysis(payload)
      const parsed = parseNeuropsychAnalysis(result.text)
      if (!parsed) {
        this.logger.warn(`Análise neuropsicológica: JSON inválido do modelo (assessment ${assessmentId})`)
        throw new BadRequestException('A IA retornou uma resposta em formato inesperado. Tente novamente.')
      }

      const saved = await this.analyses.save(this.analyses.create({
        assessmentId,
        patientId: assessment.patientId,
        psychologistId,
        status: 'completed',
        response: encrypt(JSON.stringify(parsed)),
        promptVersion: NEUROPSYCH_ANALYSIS_PROMPT_VERSION,
        model: result.usage.model,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        costUsdMicros: result.usage.costUsdMicros,
        includedFields: fields,
      }))

      return this.toDto(saved)!
    } catch (error) {
      // Falha antes de uma análise válida: nunca cobra a franquia mensal.
      await this.releaseQuota(psychologistId).catch(() => {})
      throw error
    }
  }

  async remove(assessmentId: string, analysisId: string, psychologistId: string): Promise<{ ok: true }> {
    const result = await this.analyses.delete({ id: analysisId, assessmentId, psychologistId })
    if (!result.affected) throw new NotFoundException('Análise não encontrada')
    return { ok: true }
  }

  private async assertAssessmentOwner(assessmentId: string, psychologistId: string): Promise<NeuropsychAssessment> {
    const assessment = await this.assessments.findOne({ where: { id: assessmentId, psychologistId } })
    if (!assessment) throw new NotFoundException('Avaliação não encontrada')
    return assessment
  }

  private async buildPayload(assessment: NeuropsychAssessment, fields: string[]): Promise<NeuropsychAnalysisPayload> {
    const payload: NeuropsychAnalysisPayload = {
      evaluatedDomains: assessment.evaluatedDomains ?? [],
      batteryItems: [],
    }
    for (const field of ASSESSMENT_CLINICAL_FIELDS) {
      if (fields.includes(field)) {
        (payload as any)[field] = safeDecrypt((assessment as any)[field]) ?? undefined
      }
    }
    if (fields.includes('batteryItems')) {
      const items = await this.items.find({ where: { assessmentId: assessment.id, psychologistId: assessment.psychologistId } })
      payload.batteryItems = items.map(item => ({
        name: item.name,
        procedureType: item.procedureType,
        domains: item.domains ?? [],
        status: item.status,
        purpose: safeDecrypt(item.purpose) ?? undefined,
        resultSummary: safeDecrypt(item.resultSummary) ?? undefined,
        qualitativeNotes: safeDecrypt(item.qualitativeNotes) ?? undefined,
      }))
    }
    return payload
  }

  private currentMonth(): string {
    return new Date().toISOString().slice(0, 7)
  }

  private async getCurrentPlan(userId: string, email?: string): Promise<KnownPlan> {
    if (email && COMPED_PRO_EMAILS.includes(String(email).toLowerCase())) return 'pro'
    const sub = await this.subscriptions.findOne({ where: { userId }, order: { createdAt: 'DESC' } })
    return normalizePlan((sub?.status === 'active' || sub?.status === 'trialing') ? sub.plan : 'free')
  }

  private async chargeQuota(userId: string, plan: KnownPlan): Promise<void> {
    const month = this.currentMonth()
    const limit = PLAN_LIMITS[plan].neuropsychAiMonthlyLimit
    if (limit <= 0) {
      throw new ForbiddenException({
        message: 'O Copiloto de Raciocínio Clínico está disponível no plano Pro.',
        requiredPlan: 'pro',
        currentPlan: plan,
        upgradeUrl: '/planos',
      })
    }
    await this.aiUsage.createQueryBuilder().insert().values({ userId, month }).orIgnore().execute()
    const result = await this.aiUsage
      .createQueryBuilder()
      .update()
      .set({ neuropsychAnalyses: () => '"neuropsychAnalyses" + 1' })
      .where('"userId" = :userId AND month = :month AND "neuropsychAnalyses" + 1 <= :limit', { userId, month, limit })
      .execute()

    if (!result.affected) {
      const usage = await this.aiUsage.findOne({ where: { userId, month } })
      throw new ForbiddenException({
        message: `Limite mensal de análises do Copiloto atingido (${usage?.neuropsychAnalyses ?? limit}/${limit}).`,
        limit,
        used: usage?.neuropsychAnalyses ?? limit,
        currentPlan: plan,
      })
    }
  }

  private async releaseQuota(userId: string): Promise<void> {
    const month = this.currentMonth()
    await this.aiUsage
      .createQueryBuilder()
      .update()
      .set({ neuropsychAnalyses: () => 'GREATEST("neuropsychAnalyses" - 1, 0)' })
      .where('"userId" = :userId AND month = :month', { userId, month })
      .execute()
  }

  private toDto(row: NeuropsychAiAnalysis): NeuropsychAiAnalysisDto | null {
    const decrypted = safeDecrypt(row.response)
    if (!decrypted) return null
    let result: NeuropsychAnalysisResult
    try {
      result = JSON.parse(decrypted)
    } catch {
      this.logger.warn(`Análise ${row.id}: falha ao desserializar resposta armazenada`)
      return null
    }
    return {
      id: row.id,
      status: row.status,
      result,
      model: row.model,
      promptVersion: row.promptVersion,
      inputTokens: row.inputTokens,
      outputTokens: row.outputTokens,
      costUsdMicros: row.costUsdMicros,
      includedFields: row.includedFields ?? [],
      createdAt: row.createdAt,
    }
  }
}
