import { BadRequestException, Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { NoImpersonationGuard } from '../../common/guards/no-impersonation.guard'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { NpsService } from './nps.service'
import { ConfigService } from '@nestjs/config'

@Controller('nps')
export class NpsController {
  constructor(private svc: NpsService, private cfg: ConfigService) {}

  // Public endpoints (patient side)
  @Get('survey/:token')
  getSurvey(@Param('token') token: string) {
    return this.svc.getSurvey(token)
  }

  @Post('survey/:token')
  @Throttle({ default: { limit: 3, ttl: 60 * 1000 } })
  submitResponse(
    @Param('token') token: string,
    @Body() body: { score: number; comment?: string },
  ) {
    if (body.score == null) throw new BadRequestException('Nota obrigatória')
    return this.svc.submitResponse(token, Number(body.score), body.comment)
  }

  // Authenticated (professional side)
  @Post('send')
  @UseGuards(JwtAuthGuard, CsrfGuard, NoImpersonationGuard)
  @Throttle({ default: { limit: 30, ttl: 60 * 1000 } })
  sendNps(
    @Body() body: { patientId: string; sessionId?: string; patientPhone: string; patientName: string },
    @Request() req: any,
  ) {
    const frontendUrl = this.cfg.get('FRONTEND_URL') ?? 'http://localhost:3000'
    return this.svc.sendNps(req.user.id, { ...body, frontendUrl })
  }

  @Get('results')
  @UseGuards(JwtAuthGuard, NoImpersonationGuard)
  getResults(@Request() req: any) {
    return this.svc.getResults(req.user.id)
  }
}
