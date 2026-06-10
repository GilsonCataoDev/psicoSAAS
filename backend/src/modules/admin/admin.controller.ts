import { Body, Controller, DefaultValuePipe, Get, Param, ParseIntPipe, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { AdminGuard } from '../../common/guards/admin.guard'
import { AdminService } from './admin.service'
import { OverrideSubscriptionDto } from './dto/override-subscription.dto'

@UseGuards(JwtAuthGuard, CsrfGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('stats')
  getStats() {
    return this.admin.getStats()
  }

  @Get('users')
  listUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.admin.listUsers(page, Math.min(limit, 100))
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
}
