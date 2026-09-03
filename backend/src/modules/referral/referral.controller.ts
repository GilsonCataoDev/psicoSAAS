import { Controller, Get, Req, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ReferralService } from './referral.service'
import { NoImpersonationGuard } from '../../common/guards/no-impersonation.guard'

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
}
