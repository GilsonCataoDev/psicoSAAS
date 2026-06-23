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
import { RequirePlan } from '../../common/decorators/require-plan.decorator'
import { SessionsService } from './sessions.service'
import { AiService } from './ai.service'
import { CreateSessionDto } from './dto/create-session.dto'
import { AiUsage } from './entities/ai-usage.entity'

const AI_TRANSCRIPTION_MONTHLY_SECONDS = 60 * 60
const AI_TRANSCRIPTION_MAX_SECONDS = 15 * 60

@Controller('sessions')
@UseGuards(JwtAuthGuard, CsrfGuard)
export class SessionsController {
  constructor(
    private svc: SessionsService,
    private ai: AiService,
    @InjectRepository(AiUsage) private readonly aiUsage: Repository<AiUsage>,
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
  @RequirePlan('pro')
  @Throttle({ default: { limit: 10, ttl: 60 * 1000 } })
  @UseInterceptors(FileInterceptor('audio', {
    limits: {
      fileSize: 25 * 1024 * 1024,
      files: 1,
      fields: 1,
      parts: 2,
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
    await this.chargeTranscriptionQuota(req.user.id, duration)
    const text = await this.ai.transcribeAudio(file.buffer, file.mimetype)
    return { text }
  }

  @Post('ai-summary')
  @RequirePlan('pro')
  @Throttle({ default: { limit: 20, ttl: 60 * 1000 } })
  async aiSummary(
    @Body('transcription') transcription: string,
    @Body('patientName') patientName?: string,
    @Request() req?: any,
  ) {
    if (!transcription?.trim()) throw new BadRequestException('Transcrição ausente')
    const draft = await this.ai.generateSessionSummary(transcription, patientName)
    if (req?.user?.id) await this.incrementSummaryUsage(req.user.id)
    return { draft }
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

  private async chargeTranscriptionQuota(userId: string, durationSeconds: number): Promise<void> {
    const month = this.currentMonth()
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
        { userId, month, duration: durationSeconds, limit: AI_TRANSCRIPTION_MONTHLY_SECONDS },
      )
      .execute()

    if (!result.affected) {
      const usage = await this.aiUsage.findOne({ where: { userId, month } })
      const usedMinutes = Math.ceil((usage?.transcriptionSeconds ?? 0) / 60)
      throw new ForbiddenException({
        message: `Limite mensal de transcrição por IA atingido (${usedMinutes}/60 min).`,
        limitMinutes: 60,
        usedMinutes,
      })
    }
  }

  private async incrementSummaryUsage(userId: string): Promise<void> {
    const month = this.currentMonth()
    await this.aiUsage
      .createQueryBuilder()
      .insert()
      .values({ userId, month })
      .orIgnore()
      .execute()
    await this.aiUsage.increment({ userId, month }, 'summaryRequests', 1)
  }
}
