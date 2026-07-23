import { Body, Controller, Get, Header, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common'
import { ArrayMaxSize, IsArray, IsBoolean, IsNumber, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import { Throttle } from '@nestjs/throttler'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { NoImpersonationGuard } from '../../common/guards/no-impersonation.guard'
import { PublicRoute } from '../../common/decorators/public-route.decorator'
import { RequirePlan } from '../../common/decorators/require-plan.decorator'
import { InstrumentAssignmentsService } from './instrument-assignments.service'
import { AiService } from '../sessions/ai.service'
import { AiTextQuotaService } from '../sessions/ai-text-quota.service'

class CreateInstrumentAssignmentDto {
  @IsString() @MaxLength(80) patientId: string
  @IsString() @MaxLength(80) instrumentId: string
  @IsString() @MaxLength(160) title: string
  @IsString() @IsOptional() @MaxLength(500) description?: string
  @IsString() @MaxLength(40) category: string
  @IsString() @MaxLength(20000) template: string
  @IsBoolean() @IsOptional() sendWhatsApp?: boolean
}

class SubscaleDto {
  @IsString() @MaxLength(80) label: string
  @IsNumber() score: number
  @IsString() @IsOptional() @MaxLength(40) level?: string
}

class ScoreDetailsDto {
  @IsNumber() score: number
  @IsString() @IsOptional() @MaxLength(40) level?: string
  @IsArray() @IsOptional() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => SubscaleDto) subscales?: SubscaleDto[]
}

class CriticalFlagDto {
  @IsString() @MaxLength(120) label: string
  @IsString() @MaxLength(400) note: string
}

class AssessmentAiInterpretationDto {
  @IsString() @MaxLength(80) scaleName: string
  @ValidateNested() @Type(() => ScoreDetailsDto) scoreDetails: ScoreDetailsDto
  @IsArray() @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => CriticalFlagDto) criticalFlags: CriticalFlagDto[]
}

@Controller()
export class InstrumentAssignmentsController {
  constructor(
    private readonly svc: InstrumentAssignmentsService,
    private readonly ai: AiService,
    private readonly aiTextQuota: AiTextQuotaService,
  ) {}

  @Get('instrument-assignments')
  @UseGuards(JwtAuthGuard, NoImpersonationGuard)
  @RequirePlan('pro')
  findMine(@Req() req: any, @Query('patientId') patientId?: string) {
    return this.svc.findMine(req.user.id, patientId)
  }

  @Post('instrument-assignments')
  @UseGuards(JwtAuthGuard, CsrfGuard, NoImpersonationGuard)
  @RequirePlan('pro')
  create(@Req() req: any, @Body() body: CreateInstrumentAssignmentDto) {
    return this.svc.create(body, req.user.id)
  }

  @Patch('instrument-assignments/:id/answers')
  @UseGuards(JwtAuthGuard, CsrfGuard, NoImpersonationGuard)
  @RequirePlan('pro')
  updateAnswers(@Req() req: any, @Param('id') id: string, @Body('answers') answers: Record<string, string>) {
    return this.svc.updateAnswers(id, answers ?? {}, req.user.id)
  }

  /**
   * Rascunho de interpretação por IA da pontuação de uma avaliação já
   * respondida. O alerta de pontos críticos (ex.: risco de suicídio) é
   * sempre incluído na resposta de forma determinística, fora do controle
   * do texto gerado pelo modelo — ver criticalAlert abaixo.
   */
  @Post('instrument-assignments/:id/ai-interpretation')
  @UseGuards(JwtAuthGuard, CsrfGuard, NoImpersonationGuard)
  @RequirePlan('pro')
  @Throttle({ default: { limit: 10, ttl: 60 * 1000 } })
  async generateAiInterpretation(@Req() req: any, @Param('id') id: string, @Body() body: AssessmentAiInterpretationDto) {
    await this.svc.findOwned(id, req.user.id)

    await this.aiTextQuota.reserve(req.user.id, req.user.email)
    let result
    try {
      result = await this.ai.generateAssessmentInterpretation(body.scaleName, body.scoreDetails, body.criticalFlags)
    } catch (error) {
      await this.aiTextQuota.release(req.user.id).catch(() => {})
      throw error
    }
    await this.aiTextQuota.recordUsage(req.user.id, result.usage)

    const criticalAlert = body.criticalFlags.length
      ? `Pontos críticos assinalados nesta avaliação: ${body.criticalFlags.map(f => `${f.label} — ${f.note}`).join('; ')}. Avaliação de risco imediata recomendada, independentemente do texto gerado abaixo.`
      : null

    return { draft: result.text, criticalAlert }
  }

  @Get('public/instruments/:token')
  @Header('Cache-Control', 'private, no-store')
  @PublicRoute()
  @Throttle({ long: { limit: 30, ttl: 60 * 1000 } }) // Link público: leitura limitada por IP.
  getPublic(@Param('token') token: string) {
    return this.svc.getPublic(token)
  }

  @Post('public/instruments/:token')
  @Header('Cache-Control', 'private, no-store')
  @PublicRoute()
  @Throttle({ long: { limit: 5, ttl: 60 * 1000 } }) // Envio limitado para reduzir flood e abuso de token vazado.
  submit(
    @Param('token') token: string,
    @Body('answers') answers: Record<string, string>,
    @Body('score') score?: number,
    @Body('scoreDetails') scoreDetails?: string,
  ) {
    return this.svc.submit(token, answers ?? {}, score, scoreDetails)
  }
}
