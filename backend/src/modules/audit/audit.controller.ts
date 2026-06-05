import { Controller, Get, Req, UseGuards } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AuditService } from './audit.service'

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
@SkipThrottle()
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  findMine(@Req() req: any) {
    return this.audit.findForUser(req.user.id)
  }
}
