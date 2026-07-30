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
import {
  LATEST_SUBSCRIPTION_ORDER,
  PLAN_LIMITS,
  KnownPlan,
  resolveEffectivePlan,
} from '../../common/plans'
import { Subscription } from '../billing/entities/subscription.entity'
import { SessionsService } from './sessions.service'
import { AiService } from './ai.service'
import { CreateSessionDto } from './dto/create-session.dto'
import { AiUsage } from './entities/ai-usage.entity'
import { AiTextQuotaService } from './ai-text-quota.service'

const AI_TRANSCRIPTION_MAX_SECONDS = 15 * 60

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
    @InjectRepository(Subscription) private readonly subscriptions: Repository<Subscription>,
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
  @Patch(':id') update(@Param('id') id: string, @Body() dto: Partial<CreateSessionDto>, @Request() req: any) { return this.svc.update(id, dto, req.user.id) }
  @Delete(':id') remove(@Param('id') id: string, @Request() req: any) { return this.svc.remove(id, req.user.id) }

  @Post('transcribe')
  @RequirePlan('essencial')
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
    @Request() req: any,
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('Arquivo de áudio ausente')
    const duration = this.parseDuration(durationSeconds)
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

  @Post('ai-summary')
  @RequirePlan('essencial')
  @Throttle({ default: { limit: 20, ttl: 60 * 1000 } })
  async aiSummary(
    @Body('transcription') transcription: string,
    @Request() req?: any,
  ) {
    if (!transcription?.trim()) throw new BadRequestException('Transcrição ausente')
    if (transcription.length > 12000) throw new BadRequestException('A transcrição deve ter no máximo 12.000 caracteres.')
    await this.aiTextQuota.reserve(req.user.id, req.user.email)
    let result
    try {
      result = await this.ai.generateSessionSummary(transcription)
    } catch (error) {
      await this.aiTextQuota.release(req.user.id).catch(() => {})
      throw error
    }
    await this.aiTextQuota.recordUsage(req.user.id, result.usage)
    return { draft: result.text }
  }

  @Post('ai-prontuario')
  @RequirePlan('essencial')
  @Throttle({ default: { limit: 20, ttl: 60 * 1000 } })
  async aiProntuario(
    @Body('input') input: string,
    @Body('mode') mode: 'resumo' | 'evolucao' | 'organizar' = 'organizar',
    @Request() req?: any,
  ) {
    const allowedModes = ['resumo', 'evolucao', 'organizar']
    if (!allowedModes.includes(mode)) throw new BadRequestException('Modo de IA invalido')
    if (!input?.trim()) throw new BadRequestException('Texto ausente')
    if (input.trim().length < 20) throw new BadRequestException('Informe mais detalhes para a IA organizar.')

    if (input.length > 12000) throw new BadRequestException('O texto deve ter no máximo 12.000 caracteres.')
    await this.aiTextQuota.reserve(req.user.id, req.user.email)
    let result
    try {
      result = await this.ai.generateProntuarioDraft(input, mode)
    } catch (error) {
      await this.aiTextQuota.release(req.user.id).catch(() => {})
      throw error
    }
    await this.aiTextQuota.recordUsage(req.user.id, result.usage)
    return { draft: result.text }
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

  private currentMonth(): string {
    return new Date().toISOString().slice(0, 7)
  }

  private async getCurrentPlan(userId: string, email?: string): Promise<KnownPlan> {
    const sub = await this.subscriptions.findOne({
      where: { userId },
      order: LATEST_SUBSCRIPTION_ORDER,
    })
    return resolveEffectivePlan(sub, email)
  }

  private async chargeTranscriptionQuota(userId: string, durationSeconds: number, plan: KnownPlan): Promise<void> {
    const month = this.currentMonth()
    const limit = PLAN_LIMITS[plan].transcriptionMonthlySeconds
    if (limit <= 0) {
      throw new ForbiddenException({
        message: 'Transcrição por IA está disponível a partir do plano Essencial.',
        requiredPlan: 'essencial',
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

}
