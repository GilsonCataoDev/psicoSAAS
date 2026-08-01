import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { AdminGuard } from '../../common/guards/admin.guard'
import { AdminService } from './admin.service'
import { OverrideSubscriptionDto } from './dto/override-subscription.dto'
import { ListAdminUsersDto } from './dto/list-admin-users.dto'
import { AdminCampaignService } from './admin-campaign.service'

@UseGuards(JwtAuthGuard, CsrfGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly campaigns: AdminCampaignService,
  ) {}

  @Get('health-scores')
  getHealthScores() {
    return this.admin.getHealthScores()
  }

  @Get('monitor')
  monitor() {
    return this.admin.getMonitor()
  }

  @Get('stats')
  getStats() {
    return this.admin.getStats()
  }

  @Get('users')
  listUsers(@Query() query: ListAdminUsersDto) {
    return this.admin.listUsers(query)
  }

  @Get('users/:id')
  getUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.getUser(id)
  }

  @Patch('users/:id/subscription')
  overrideSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OverrideSubscriptionDto,
  ) {
    return this.admin.overrideSubscription(id, dto)
  }

  @Delete('cleanup-test-users')
  cleanupTestUsers() {
    return this.admin.cleanupTestUsers()
  }

  @Post('campaigns/pro-upgrade/send')
  sendProUpgradeCampaign() {
    return this.campaigns.sendProUpgradeOffer()
  }
}
