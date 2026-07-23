import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common'
import { IsString, MaxLength, MinLength } from 'class-validator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AdminGuard } from '../../common/guards/admin.guard'
import { ChurnService } from './churn.service'
import { RiskLevel } from './entities/tenant-health.entity'
import { NotificationsService } from '../notifications/notifications.service'

class SendChurnWhatsAppDto {
  @IsString() @MaxLength(30) phone: string
  @IsString() @MinLength(1) @MaxLength(2000) message: string
}

@Controller('admin/churn')
@UseGuards(JwtAuthGuard, AdminGuard)
export class ChurnController {
  constructor(
    private readonly svc: ChurnService,
    private readonly notifications: NotificationsService,
  ) {}

  @Get('dashboard')
  getDashboard(
    @Query('riskLevel') riskLevel?: RiskLevel,
    @Query('plan') plan?: string,
    @Query('days') days?: string,
  ) {
    return this.svc.getDashboard({
      riskLevel,
      plan,
      days: days ? Number(days) : undefined,
    })
  }

  @Get('analytics')
  getAnalytics() {
    return this.svc.getAnalytics()
  }

  @Get('alerts')
  getAlerts(@Query('resolved') resolved?: string) {
    const resolvedBool = resolved === 'true' ? true : resolved === 'false' ? false : undefined
    return this.svc.getAlerts({ resolved: resolvedBool })
  }

  @Patch('alerts/:id/resolve')
  resolveAlert(@Param('id') id: string) {
    return this.svc.resolveAlert(id)
  }

  @Get('user/:userId/risk')
  getUserRisk(@Param('userId') userId: string) {
    return this.svc.calculateChurnRisk(userId)
  }

  @Get('user/:userId/ai-diagnose')
  async getUserAiDiagnose(@Param('userId') userId: string) {
    const risk = await this.svc.calculateChurnRisk(userId)
    return this.svc.aiDiagnose({
      daysWithoutLogin: risk.daysSinceLastActive ?? 0,
      patients: risk.patientCount,
      sessions: risk.sessionCount,
      appointments: 0,
      score: risk.score,
    })
  }

  @Get('user/:userId/timeline')
  getUserTimeline(@Param('userId') userId: string) {
    return this.svc.getBehaviorTimeline(userId)
  }

  @Get('user/:userId/activation')
  getUserActivation(@Param('userId') userId: string) {
    return this.svc.checkActivation(userId)
  }

  @Post('user/:userId/send-reactivation')
  sendReactivation(@Param('userId') userId: string) {
    return this.svc.sendReactivationEmail(userId)
  }

  /**
   * Envia uma mensagem (ex.: diagnóstico gerado por IA) pelo WhatsApp da
   * própria conta do admin — não existe um número "da UseCognia" no Evolution
   * API, cada psicólogo tem sua própria instância conectada.
   */
  @Post('user/:userId/send-whatsapp')
  sendWhatsApp(@Req() req: any, @Param('userId') userId: string, @Body() body: SendChurnWhatsAppDto) {
    return this.notifications.sendDirectWhatsApp(body.phone, body.message, req.user.id, {
      type: 'churn_admin_message',
      patientId: userId,
    })
  }
}
