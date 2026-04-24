import { Controller, Get, Req, UseGuards } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AnalyticsService } from './analytics.service'

@Controller('analytics')
@UseGuards(JwtAuthGuard)
@SkipThrottle()
export class AnalyticsController {
  constructor(private svc: AnalyticsService) {}

  @Get('dashboard')
  dashboard(@Req() req: any) {
    return this.svc.getDashboardStats(req.user.id)
  }
}
