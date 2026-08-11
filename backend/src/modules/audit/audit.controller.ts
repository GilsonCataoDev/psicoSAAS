import { Controller, Get, Req, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AuditService } from './audit.service'
import { NoImpersonationGuard } from '../../common/guards/no-impersonation.guard'

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, NoImpersonationGuard)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  findMine(@Req() req: any) {
    return this.audit.findForUser(req.user.id)
  }
}
