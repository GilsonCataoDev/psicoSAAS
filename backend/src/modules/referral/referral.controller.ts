import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, Req, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ReferralService } from './referral.service'
import { NoImpersonationGuard } from '../../common/guards/no-impersonation.guard'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { AdminGuard } from '../../common/guards/admin.guard'
import { MarkReferralCommissionPaidDto, UpdateReferralPayoutProfileDto } from './dto/referral-payout.dto'

@Controller('referral')
@UseGuards(JwtAuthGuard, NoImpersonationGuard)
export class ReferralController {
  constructor(private svc: ReferralService) {}

  @Get()
  async getMyReferral(@Req() req: any) {
    // Garante que o código existe para este usuário
    const code = await this.svc.getOrCreateCode(req.user)
    const stats = await this.svc.getStats(req.user.id)
    return { ...stats, code }
  }

  @Patch('payout-profile')
  @UseGuards(CsrfGuard)
  savePayoutProfile(@Req() req: any, @Body() dto: UpdateReferralPayoutProfileDto) {
    return this.svc.savePayoutProfile(req.user.id, dto)
  }
}

@Controller('admin/referrals')
@UseGuards(JwtAuthGuard, CsrfGuard, AdminGuard, NoImpersonationGuard)
export class ReferralAdminController {
  constructor(private readonly svc: ReferralService) {}

  @Get('commissions')
  list(@Query('status') status?: any) {
    return this.svc.listAdminCommissions(status)
  }

  @Patch('commissions/:id/paid')
  markPaid(@Param('id', ParseUUIDPipe) id: string, @Body() dto: MarkReferralCommissionPaidDto) {
    return this.svc.markCommissionPaid(id, dto.payoutReference)
  }
}
