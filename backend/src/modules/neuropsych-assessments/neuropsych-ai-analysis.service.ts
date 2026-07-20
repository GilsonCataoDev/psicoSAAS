import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { encrypt, safeDecrypt } from '../../common/crypto/encrypt.util'
import { PLAN_LIMITS, KnownPlan, normalizePlan } from '../../common/plans'
import { Subscription } from '../billing/entities/subscription.entity'
import { Patient } from '../patients/entities/patient.entity'
import {
  AiService, CLAUDE_HAIKU_INPUT_USD_MICROS_PER_TOKEN, CLAUDE_HAIKU_OUTPUT_USD_MICROS_PER_TOKEN,
  NeuropsychAnalysisPayload, NEUROPSYCH_ANALYSIS_PROMPT_VERSION,
} from '../sessions/ai.service'
import { AiUsage } from '../sessions/entities/ai-usage.entity'
import { NeuropsychAssessment } from './entities/neuropsych-assessment.entity'
import { NeuropsychBatteryItem } from './entities/neuropsych-battery-item.entity'
import { NeuropsychAiAnalysis } from './entities/neuropsych-ai-analysis.entity'
import { parseNeuropsychAnalysis, NeuropsychAnalysisResult } from './neuropsych-analysis.schema'
import { sanitizeClinicalText } from './neuropsych-identifier-redaction'
import { NEUROPSYCH_AI_LIMITS } from './neuropsych-ai-limits'

const ASSESSMENT_CLINICAL_FIELDS = ['referralQuestion', 'clinicalHistory', 'clinicalHypotheses', 'qualitativeObservations'] as const
const COMPED_PRO_EMAILS = (process.env.COMPED_PRO_EMAILS ?? 'gilsonfilho96@outlook.com')
  .split(',')
  .map(email => email.trim().toLowerCase())
  .filter(Boolean)

// Linha "sentinela" no ai_usage que acumula o custo do Copiloto de TODAS as
// contas no mês — não corresponde a nenhum usuário real. ai_usage.userId não
// tem FK para users, então este UUID fixo nunca colide com uma conta real.
const GLOBAL_BUDGET_SENTINEL_USER_ID = '00000000-0000-0000-0000-000000000000'

// Estimativa conservadora de tokens por caractere de texto em português
// (tende a superestimar tokens, o que é o lado seguro para reservar orçamento).
const CHARS_PER_TOKEN_ESTIMATE = 3

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
    @InjectRepository(Patient) private readonly patients: Repository<Patient>,
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
    const month = this.currentMonth()

    await this.chargeQuota(psychologistId, month, plan)

    const estimatedMaxCostUsdMicros = this.estimateMaxCostUsdMicros()
    let globalReserved = false
    let globalSettled = false

    try {
      await this.reserveGlobalBudget(month, estimatedMaxCostUsdMicros)
      globalReserved = true

      const patient = await this.patients.findOne({ where: { id: assessment.patientId, psychologistId }, select: ['name'] })
      const payload = await this.buildPayload(assessment, fields, patient?.name)

      const result = await this.ai.generateNeuropsychAnalysis(payload, {
        maxOutputTokens: NEUROPSYCH_AI_LIMITS.maxOutputTokens,
        timeoutMs: NEUROPSYCH_AI_LIMITS.timeoutMs,
        maxInputChars: NEUROPSYCH_AI_LIMITS.maxInputChars,
      })

      // A partir daqui o provedor JÁ cobrou pela chamada, independente do JSON
      // ser válido — o custo real é sempre registrado, tanto por conta quanto
      // no orçamento global. A franquia mensal de ANÁLISES (contagem), essa
      // sim, só é consumida se o resultado for válido (ver catch abaixo).
      await this.recordRealUsage(psychologistId, month, result.usage.inputTokens, result.usage.outputTokens, result.usage.costUsdMicros)
      await this.settleGlobalBudget(month, estimatedMaxCostUsdMicros, result.usage.costUsdMicros)
      globalSettled = true

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

      const dto = this.toDto(saved)
      if (!dto) {
        // Não deveria acontecer: acabamos de criptografar este mesmo conteúdo.
        // Se acontecer, é um bug real (ex.: ENCRYPTION_KEY mudou no meio do
        // processo) — não devolver corpo vazio silenciosamente.
        throw new InternalServerErrorException('A análise foi salva, mas não foi possível confirmá-la. Recarregue a página.')
      }
      return dto
    } catch (error) {
      // Falha antes de uma análise válida: nunca cobra a franquia mensal de
      // contagem. O custo real em dólares, se algo já foi cobrado pelo
      // provedor, já foi registrado acima antes deste catch — não é revertido.
      await this.releaseQuota(psychologistId, month).catch(() => {})
      if (globalReserved && !globalSettled) {
        await this.settleGlobalBudget(month, estimatedMaxCostUsdMicros, 0).catch(() => {})
      }
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

  private async buildPayload(assessment: NeuropsychAssessment, fields: string[], patientName: string | undefined): Promise<NeuropsychAnalysisPayload> {
    const payload: NeuropsychAnalysisPayload = {
      evaluatedDomains: assessment.evaluatedDomains ?? [],
      batteryItems: [],
    }
    for (const field of ASSESSMENT_CLINICAL_FIELDS) {
      if (fields.includes(field)) {
        const decrypted = safeDecrypt((assessment as any)[field])
        ;(payload as any)[field] = sanitizeClinicalText(decrypted, patientName)
      }
    }
    if (fields.includes('batteryItems')) {
      const items = await this.items.find({ where: { assessmentId: assessment.id, psychologistId: assessment.psychologistId } })
      payload.batteryItems = items.map(item => ({
        name: item.name,
        procedureType: item.procedureType,
        domains: item.domains ?? [],
        status: item.status,
        purpose: sanitizeClinicalText(safeDecrypt(item.purpose), patientName),
        resultSummary: sanitizeClinicalText(safeDecrypt(item.resultSummary), patientName),
        qualitativeNotes: sanitizeClinicalText(safeDecrypt(item.qualitativeNotes), patientName),
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

  /** Estimativa de custo máximo (pior caso) de uma chamada, usada para reservar orçamento global antes de saber o custo real. */
  private estimateMaxCostUsdMicros(): number {
    const maxInputTokens = Math.ceil(NEUROPSYCH_AI_LIMITS.maxInputChars / CHARS_PER_TOKEN_ESTIMATE)
    return (maxInputTokens * CLAUDE_HAIKU_INPUT_USD_MICROS_PER_TOKEN)
      + (NEUROPSYCH_AI_LIMITS.maxOutputTokens * CLAUDE_HAIKU_OUTPUT_USD_MICROS_PER_TOKEN)
  }

  private async chargeQuota(userId: string, month: string, plan: KnownPlan): Promise<void> {
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

  private async releaseQuota(userId: string, month: string): Promise<void> {
    await this.aiUsage
      .createQueryBuilder()
      .update()
      .set({ neuropsychAnalyses: () => 'GREATEST("neuropsychAnalyses" - 1, 0)' })
      .where('"userId" = :userId AND month = :month', { userId, month })
      .execute()
  }

  /** Reserva o pior caso de custo no ledger global antes de chamar o provedor. Bloqueio atômico via UPDATE condicional. */
  private async reserveGlobalBudget(month: string, estimateMicros: number): Promise<void> {
    const budgetMicros = NEUROPSYCH_AI_LIMITS.globalMonthlyBudgetUsd * 1_000_000
    await this.aiUsage
      .createQueryBuilder()
      .insert()
      .values({ userId: GLOBAL_BUDGET_SENTINEL_USER_ID, month })
      .orIgnore()
      .execute()
    const result = await this.aiUsage
      .createQueryBuilder()
      .update()
      .set({ neuropsychCostUsdMicros: () => `"neuropsychCostUsdMicros" + ${estimateMicros}` })
      .where(
        '"userId" = :userId AND month = :month AND "neuropsychCostUsdMicros" + :estimate <= :budget',
        { userId: GLOBAL_BUDGET_SENTINEL_USER_ID, month, estimate: estimateMicros, budget: budgetMicros },
      )
      .execute()

    if (!result.affected) {
      // Mensagem amigável, sem expor números internos de orçamento/custo.
      throw new ForbiddenException({
        message: 'O Copiloto de Raciocínio Clínico atingiu o limite de uso geral neste mês. Tente novamente em alguns dias ou no próximo mês.',
      })
    }
  }

  /** Ajusta o ledger global do valor reservado (pior caso) para o valor real cobrado, sem nunca ficar negativo. */
  private async settleGlobalBudget(month: string, reservedMicros: number, actualMicros: number): Promise<void> {
    const delta = actualMicros - reservedMicros
    await this.aiUsage
      .createQueryBuilder()
      .update()
      .set({ neuropsychCostUsdMicros: () => `GREATEST("neuropsychCostUsdMicros" + (${delta}), 0)` })
      .where('"userId" = :userId AND month = :month', { userId: GLOBAL_BUDGET_SENTINEL_USER_ID, month })
      .execute()
  }

  /** Registra tokens/custo reais da chamada na conta do usuário, independente do JSON ser válido — dinheiro já foi gasto. */
  private async recordRealUsage(userId: string, month: string, inputTokens: number, outputTokens: number, costMicros: number): Promise<void> {
    await this.aiUsage
      .createQueryBuilder()
      .update()
      .set({
        neuropsychInputTokens: () => `"neuropsychInputTokens" + ${inputTokens}`,
        neuropsychOutputTokens: () => `"neuropsychOutputTokens" + ${outputTokens}`,
        neuropsychCostUsdMicros: () => `"neuropsychCostUsdMicros" + ${costMicros}`,
      })
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
