import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { NoImpersonationGuard } from '../../common/guards/no-impersonation.guard'
import { AI_CONSENT_SCOPES, RecordAiConsentDto } from './dto/ai-consent.dto'
import { AiConsentScope } from './entities/ai-consent-event.entity'
import { AiConsentService } from './ai-consent.service'

@Controller('ai-governance/consents')
@UseGuards(JwtAuthGuard, NoImpersonationGuard)
export class AiGovernanceController {
  constructor(private readonly consents: AiConsentService) {}

  @Get(':scope')
  status(@Req() req: any, @Param('scope') value: string, @Query('patientId') patientId?: string) {
    return this.consents.status(req.user.id, this.scope(value), patientId)
  }

  @Post(':scope')
  @UseGuards(CsrfGuard)
  accept(@Req() req: any & Request, @Param('scope') value: string, @Body() dto: RecordAiConsentDto) {
    return this.consents.accept(req.user.id, this.scope(value), dto, this.context(req))
  }

  @Delete(':scope')
  @UseGuards(CsrfGuard)
  revoke(@Req() req: any & Request, @Param('scope') value: string, @Query('patientId') patientId?: string) {
    return this.consents.revoke(req.user.id, this.scope(value), patientId, this.context(req))
  }

  private scope(value: string): AiConsentScope {
    if (!(AI_CONSENT_SCOPES as readonly string[]).includes(value)) throw new BadRequestException('Escopo de consentimento invalido')
    return value as AiConsentScope
  }

  private context(req: Request) {
    return { ip: req.ip, userAgent: req.headers['user-agent'] }
  }
}
