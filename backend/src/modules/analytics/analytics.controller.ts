import { Controller, Get, Req, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AnalyticsService } from './analytics.service'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Subscription } from '../billing/entities/subscription.entity'
import { normalizePlan } from '../../common/plans'

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(
    private svc: AnalyticsService,
    @InjectRepository(Subscription)
    private readonly subscriptions: Repository<Subscription>,
  ) {}

  @Get('dashboard')
  async dashboard(@Req() req: any) {
    const [stats, subscription] = await Promise.all([
      this.svc.getDashboardStats(req.user.id),
      this.subscriptions.findOne({
        where: { userId: req.user.id },
        order: { createdAt: 'DESC' },
      }),
    ])

    const plan = normalizePlan(
      subscription?.status === 'active' || subscription?.status === 'trialing'
        ? subscription.plan
        : 'free',
    )
    const hasAdvancedAnalytics = plan === 'pro' || plan === 'premium'

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
}
