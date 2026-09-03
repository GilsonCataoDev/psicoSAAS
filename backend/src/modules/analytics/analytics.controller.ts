import { Controller, Get, Req, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AnalyticsService } from './analytics.service'
import { PlanAccessService } from '../../common/plan-access/plan-access.service'
import { NoImpersonationGuard } from '../../common/guards/no-impersonation.guard'

@Controller('analytics')
@UseGuards(JwtAuthGuard, NoImpersonationGuard)
export class AnalyticsController {
  constructor(
    private svc: AnalyticsService,
    private readonly planAccess: PlanAccessService,
  ) {}

  @Get('dashboard')
  async dashboard(@Req() req: any) {
    const [stats, hasAdvancedAnalytics] = await Promise.all([
      this.svc.getDashboardStats(req.user.id),
      this.planAccess.hasAccess(req.user.id, 'pro', req.user.email),
    ])

    if (hasAdvancedAnalytics) {
      return { ...stats, advancedAnalyticsLocked: false }
    }

    const {
      clinicIndicators: _clinicIndicators,
      roi: _roi,
      revenueChart: _revenueChart,
      ...basicStats
    } = stats

    return {
      ...basicStats,
      advancedAnalyticsLocked: true,
      requiredPlan: 'pro',
    }
  }

  @Get('retention')
  retention(@Req() req: any) {
    return this.svc.getRetentionMetrics(req.user.id)
  }
}
