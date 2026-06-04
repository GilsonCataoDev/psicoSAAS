import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import { RequirePlan } from '../../common/decorators/require-plan.decorator'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { NotificationsService } from './notifications.service'

@Controller('notifications/whatsapp')
@UseGuards(JwtAuthGuard)
@RequirePlan('pro')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('status')
  @SkipThrottle()
  status() {
    return this.notifications.getWhatsAppStatus()
  }

  @Post('connect')
  @UseGuards(CsrfGuard)
  connect() {
    return this.notifications.getWhatsAppQrCode()
  }

  @Post('test')
  @UseGuards(CsrfGuard)
  test(@Request() req: any, @Body('phone') phone?: string) {
    return this.notifications.sendTestWhatsApp(req.user.id, phone)
  }
}
