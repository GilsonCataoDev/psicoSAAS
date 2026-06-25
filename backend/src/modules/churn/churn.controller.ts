import { Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AdminGuard } from '../../common/guards/admin.guard'
import { ChurnService } from './churn.service'
import { RiskLevel } from './entities/tenant-health.entity'

@Controller('admin/churn')
@UseGuards(JwtAuthGuard, AdminGuard)
export class ChurnController {
  constructor(private readonly svc: ChurnService) {}

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
}
