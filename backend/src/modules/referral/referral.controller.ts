import { Controller, Get, Req, UseGuards } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ReferralService } from './referral.service'

@Controller('referral')
@UseGuards(JwtAuthGuard)
@SkipThrottle()
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
