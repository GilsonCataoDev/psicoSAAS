import {
  BadRequestException, Body, Controller, Delete, ForbiddenException, Get,
  Param, Patch, Post, Query, Request, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Throttle } from '@nestjs/throttler'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { NoImpersonationGuard } from '../../common/guards/no-impersonation.guard'
import { RequirePlan } from '../../common/decorators/require-plan.decorator'
import { PLAN_LIMITS, KnownPlan } from '../../common/plans'
import { PlanAccessService } from '../../common/plan-access/plan-access.service'
import { SessionsService } from './sessions.service'
import { AiService } from './ai.service'
import { CreateSessionDto } from './dto/create-session.dto'
import { AiUsage } from './entities/ai-usage.entity'
import { AiTextQuotaService } from './ai-text-quota.service'
import { AiConsentService } from '../ai-governance/ai-consent.service'
import { ClinicalAiDraftService } from '../ai-governance/clinical-ai-draft.service'
import { AudioMetadataService } from './audio-metadata.service'

const AI_TRANSCRIPTION_MAX_SECONDS = 15 * 60
// Transcrição de chamada cobre a sessão inteira (não um trecho ditado), então
// precisa de um teto bem maior que o do ditado avulso.
const CALL_TRANSCRIPTION_MAX_SECONDS = 90 * 60

// NoImpersonationGuard roda após o JwtAuthGuard (mesmo array) e nega acesso a
// conteúdo clínico enquanto um admin está "vendo como" outro usuário.
@Controller('sessions')
@UseGuards(JwtAuthGuard, CsrfGuard, NoImpersonationGuard)
export class SessionsController {
  constructor(
    private svc: SessionsService,
    private ai: AiService,
    private readonly aiTextQuota: AiTextQuotaService,
    @InjectRepository(AiUsage) private readonly aiUsage: Repository<AiUsage>,
    private readonly planAccess: PlanAccessService,
    private readonly aiConsents: AiConsentService,
    private readonly aiDrafts: ClinicalAiDraftService,
    private readonly audioMetadata: AudioMetadataService,
  ) {}

  @Get() findAll(
    @Request() req: any,
    @Query('patientId') patientId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('includeClinical') includeClinical?: string,
  ) {
    return this.svc.findAll(
      req.user.id,
      patientId,
      dateFrom,
      dateTo,
      includeClinical === 'true',
    )
  }
  @Get('dashboard') dashboard(@Request() req: any) { return this.svc.getDashboard(req.user.id) }
  @Get(':id') findOne(@Param('id') id: string, @Request() req: any) { return this.svc.findOne(id, req.user.id) }
  @Post() create(@Body() dto: CreateSessionDto, @Request() req: any) { return this.svc.create(dto, req.user.id) }
  @Post('historical') createHistorical(@Body() dto: CreateSessionDto, @Request() req: any) {
    return this.svc.createHistorical(dto, req.user.id)
  }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: Partial<CreateSessionDto>, @Request() req: any) { return this.svc.update(id, dto, req.user.id) }
  @Delete(':id') remove(@Param('id') id: string, @Request() req: any) { return this.svc.remove(id, req.user.id) }

  @Post('transcribe')
  @RequirePlan('pro')
  @Throttle({ default: { limit: 10, ttl: 60 * 1000 } })
  @UseInterceptors(FileInterceptor('audio', {
    limits: {
      fileSize: 25 * 1024 * 1024,
      files: 1,
      fields: 2,
      parts: 6,
      fieldNameSize: 32,
      fieldSize: 32,
    },
  }))
  async transcribe(
    @UploadedFile() file: Express.Multer.File,
    @Body('durationSeconds') durationSeconds: string,
    @Body('patientId') patientId: string,
    @Request() req: any,
  ) {
    await this.aiDrafts.getPatient(req.user.id, patientId)
    await this.aiConsents.assertActive(req.user.id, 'session_recording_transcription', patientId)
    if (!file?.buffer?.length) throw new BadRequestException('Arquivo de áudio ausente')
    this.parseDuration(durationSeconds)
    const duration = await this.audioMetadata.durationSeconds(file.buffer, file.mimetype, AI_TRANSCRIPTION_MAX_SECONDS)
    const plan = await this.getCurrentPlan(req.user.id, req.user.email)
    await this.chargeTranscriptionQuota(req.user.id, duration, plan)
    try {
      const text = await this.ai.transcribeAudio(file.buffer, file.mimetype)
      return { text }
    } catch (error) {
      await this.releaseTranscriptionQuota(req.user.id, duration).catch(() => {})
      throw error
    }
  }

  @Post('transcribe-call')
  @RequirePlan('pro')
  @Throttle({ default: { limit: 5, ttl: 60 * 1000 } })
  @UseInterceptors(FileInterceptor('audio', {
    limits: {
      fileSize: 30 * 1024 * 1024,
      files: 1,
      fields: 2,
      parts: 6,
      fieldNameSize: 32,
      fieldSize: 32,
    },
  }))
  async transcribeCall(
    @UploadedFile() file: Express.Multer.File,
    @Body('durationSeconds') durationSeconds: string,
    @Body('patientId') patientId: string,
    @Request() req: any,
  ) {
    await this.aiDrafts.getPatient(req.user.id, patientId)
    await this.aiConsents.assertActive(req.user.id, 'session_recording_transcription', patientId)
    if (!file?.buffer?.length) throw new BadRequestException('Arquivo de áudio ausente')
    this.parseCallDuration(durationSeconds)
    await this.audioMetadata.durationSeconds(file.buffer, file.mimetype, CALL_TRANSCRIPTION_MAX_SECONDS)
    const plan = await this.getCurrentPlan(req.user.id, req.user.email)
    await this.chargeCallTranscriptionQuota(req.user.id, plan)
    try {
      const text = await this.ai.transcribeAudio(file.buffer, file.mimetype)
      return { text }
    } catch (error) {
      await this.releaseCallTranscriptionQuota(req.user.id).catch(() => {})
      throw error
    }
  }

  @Post('ai-summary')
  @RequirePlan('pro')
  @Throttle({ default: { limit: 20, ttl: 60 * 1000 } })
  async aiSummary(
    @Body('transcription') transcription: string,
    @Body('patientId') patientId: string,
    @Request() req?: any,
  ) {
    if (!transcription?.trim()) throw new BadRequestException('Transcrição ausente')
    if (transcription.length > 12000) throw new BadRequestException('A transcrição deve ter no máximo 12.000 caracteres.')
    await this.aiConsents.assertActive(req.user.id, 'clinical_ai_processing')
    const patient = await this.aiDrafts.getPatient(req.user.id, patientId)
    await this.aiTextQuota.reserve(req.user.id, req.user.email)
    let result
    try {
      result = await this.ai.generateSessionSummary(transcription, patient.name)
    } catch (error) {
      await this.aiTextQuota.release(req.user.id).catch(() => {})
      throw error
    }
    await this.aiTextQuota.recordUsage(req.user.id, result.usage)
    const draft = await this.aiDrafts.create({ psychologistId: req.user.id, patientId, kind: 'session_summary', sourceText: transcription, content: result.text, usage: result.usage, promptVersion: 'session-summary-v2' })
    return { draft: result.text, draftId: draft.id }
  }

  @Post('ai-prontuario')
  @RequirePlan('pro')
  @Throttle({ default: { limit: 20, ttl: 60 * 1000 } })
  async aiProntuario(
    @Body('input') input: string,
    @Body('mode') mode: 'resumo' | 'evolucao' | 'organizar' = 'organizar',
    @Body('patientId') patientId: string,
    @Request() req?: any,
  ) {
    const allowedModes = ['resumo', 'evolucao', 'organizar']
    if (!allowedModes.includes(mode)) throw new BadRequestException('Modo de IA invalido')
    if (!input?.trim()) throw new BadRequestException('Texto ausente')
    if (input.trim().length < 20) throw new BadRequestException('Informe mais detalhes para a IA organizar.')

    if (input.length > 12000) throw new BadRequestException('O texto deve ter no máximo 12.000 caracteres.')
    await this.aiConsents.assertActive(req.user.id, 'clinical_ai_processing')
    const patient = await this.aiDrafts.getPatient(req.user.id, patientId)
    await this.aiTextQuota.reserve(req.user.id, req.user.email)
    let result
    try {
      result = await this.ai.generateProntuarioDraft(input, mode, patient.name)
    } catch (error) {
      await this.aiTextQuota.release(req.user.id).catch(() => {})
      throw error
    }
    await this.aiTextQuota.recordUsage(req.user.id, result.usage)
    const draft = await this.aiDrafts.create({ psychologistId: req.user.id, patientId, kind: 'clinical_note', sourceText: input, content: result.text, usage: result.usage, promptVersion: `clinical-note-${mode}-v2` })
    return { draft: result.text, draftId: draft.id }
  }

  @Post('ai-session-plan')
  @RequirePlan('pro')
  @Throttle({ default: { limit: 20, ttl: 60 * 1000 } })
  async aiSessionPlan(
    @Body('clinicalContext') clinicalContext: string,
    @Body('patientId') patientId: string,
    @Request() req?: any,
  ) {
    if (!clinicalContext?.trim()) throw new BadRequestException('Historico de sessões ausente')
    if (clinicalContext.length > 12000) throw new BadRequestException('O historico deve ter no máximo 12.000 caracteres.')
    await this.aiConsents.assertActive(req.user.id, 'clinical_ai_processing')
    const patient = await this.aiDrafts.getPatient(req.user.id, patientId)
    await this.aiTextQuota.reserve(req.user.id, req.user.email)
    let result
    try {
      result = await this.ai.generateSessionPlan(clinicalContext, patient.name)
    } catch (error) {
      await this.aiTextQuota.release(req.user.id).catch(() => {})
      throw error
    }
    await this.aiTextQuota.recordUsage(req.user.id, result.usage)
    const draft = await this.aiDrafts.create({ psychologistId: req.user.id, patientId, kind: 'session_plan', sourceText: clinicalContext, content: result.text, usage: result.usage, promptVersion: 'session-plan-v2' })
    return { draft: result.text, draftId: draft.id }
  }

  private parseDuration(value?: string): number {
    const duration = Math.ceil(Number(value))
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new BadRequestException('Duração da gravação ausente')
    }
    if (duration > AI_TRANSCRIPTION_MAX_SECONDS) {
      throw new BadRequestException('Cada transcrição pode ter no máximo 15 minutos.')
    }
    return duration
  }

  private parseCallDuration(value?: string): number {
    const duration = Math.ceil(Number(value))
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new BadRequestException('Duração da gravação ausente')
    }
    if (duration > CALL_TRANSCRIPTION_MAX_SECONDS) {
      throw new BadRequestException('Cada chamada transcrita pode ter no máximo 90 minutos.')
    }
    return duration
  }

  private currentMonth(): string {
    return new Date().toISOString().slice(0, 7)
  }

  private async getCurrentPlan(userId: string, email?: string): Promise<KnownPlan> {
    return this.planAccess.getCurrentPlan(userId, email)
  }

  private async chargeTranscriptionQuota(userId: string, durationSeconds: number, plan: KnownPlan): Promise<void> {
    const month = this.currentMonth()
    const limit = PLAN_LIMITS[plan].transcriptionMonthlySeconds
    if (limit <= 0) {
      throw new ForbiddenException({
        message: 'Transcrição por IA está disponível a partir do plano Pro.',
        requiredPlan: 'pro',
        currentPlan: plan,
        upgradeUrl: '/planos',
      })
    }
    // Garante que a linha existe (idempotente sob concorrência pelo ON CONFLICT DO NOTHING)
    await this.aiUsage
      .createQueryBuilder()
      .insert()
      .values({ userId, month })
      .orIgnore()
      .execute()
    // UPDATE atômico: decrementa cota apenas se ainda há espaço. 0 affected = limite atingido.
    const result = await this.aiUsage
      .createQueryBuilder()
      .update()
      .set({ transcriptionSeconds: () => `"transcriptionSeconds" + ${durationSeconds}` })
      .where(
        '"userId" = :userId AND month = :month AND "transcriptionSeconds" + :duration <= :limit',
        { userId, month, duration: durationSeconds, limit },
      )
      .execute()

    if (!result.affected) {
      const usage = await this.aiUsage.findOne({ where: { userId, month } })
      const usedMinutes = Math.ceil((usage?.transcriptionSeconds ?? 0) / 60)
      const limitMinutes = Math.floor(limit / 60)
      throw new ForbiddenException({
        message: `Limite mensal de transcrição por IA atingido (${usedMinutes}/${limitMinutes} min).`,
        limitMinutes,
        usedMinutes,
        currentPlan: plan,
        upgradeUrl: plan === 'pro' ? undefined : '/planos',
      })
    }
  }

  private async releaseTranscriptionQuota(userId: string, durationSeconds: number): Promise<void> {
    const month = this.currentMonth()
    await this.aiUsage
      .createQueryBuilder()
      .update()
      .set({
        transcriptionSeconds: () => `GREATEST("transcriptionSeconds" - ${durationSeconds}, 0)`,
      })
      .where('"userId" = :userId AND month = :month', { userId, month })
      .execute()
  }

  private async chargeCallTranscriptionQuota(userId: string, plan: KnownPlan): Promise<void> {
    const month = this.currentMonth()
    const limit = PLAN_LIMITS[plan].callTranscriptionMonthlyLimit
    if (limit <= 0) {
      throw new ForbiddenException({
        message: 'Transcrição de chamada está disponível a partir do plano Pro.',
        requiredPlan: 'pro',
        currentPlan: plan,
        upgradeUrl: '/planos',
      })
    }
    await this.aiUsage
      .createQueryBuilder()
      .insert()
      .values({ userId, month })
      .orIgnore()
      .execute()
    const result = await this.aiUsage
      .createQueryBuilder()
      .update()
      .set({ callTranscriptions: () => '"callTranscriptions" + 1' })
      .where(
        '"userId" = :userId AND month = :month AND "callTranscriptions" + 1 <= :limit',
        { userId, month, limit },
      )
      .execute()

    if (!result.affected) {
      const usage = await this.aiUsage.findOne({ where: { userId, month } })
      const used = usage?.callTranscriptions ?? 0
      throw new ForbiddenException({
        message: `Limite mensal de transcrição de chamadas atingido (${used}/${limit} sessões).`,
        used,
        limit,
        currentPlan: plan,
        upgradeUrl: plan === 'pro' ? undefined : '/planos',
      })
    }
  }

  private async releaseCallTranscriptionQuota(userId: string): Promise<void> {
    const month = this.currentMonth()
    await this.aiUsage
      .createQueryBuilder()
      .update()
      .set({
        callTranscriptions: () => 'GREATEST("callTranscriptions" - 1, 0)',
      })
      .where('"userId" = :userId AND month = :month', { userId, month })
      .execute()
  }

}
