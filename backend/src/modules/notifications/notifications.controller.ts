import { Body, Controller, Delete, Get, Post, Request, UseGuards } from '@nestjs/common'
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
  status(@Request() req: any) {
    return this.notifications.getWhatsAppStatus(req.user.id)
  }

  @Post('connect')
  @UseGuards(CsrfGuard)
  connect(@Request() req: any) {
    return this.notifications.getWhatsAppQrCode(req.user.id)
  }

  @Post('reset')
  @UseGuards(CsrfGuard)
  reset(@Request() req: any) {
    return this.notifications.resetWhatsAppConnection(req.user.id)
  }

  @Post('test')
  @UseGuards(CsrfGuard)
  test(@Request() req: any, @Body('phone') phone?: string) {
    return this.notifications.sendTestWhatsApp(req.user.id, phone)
  }
}

@Controller('notifications/push')
@UseGuards(JwtAuthGuard)
export class PushNotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('status')
  @SkipThrottle()
  status(@Request() req: any) {
    return this.notifications.getPushStatus(req.user.id)
  }

  @Post('subscribe')
  @UseGuards(CsrfGuard)
  subscribe(@Request() req: any, @Body() body: any) {
    return this.notifications.savePushSubscription(req.user.id, body, req.headers['user-agent'])
  }

  @Delete('unsubscribe')
  @UseGuards(CsrfGuard)
  unsubscribe(@Request() req: any, @Body('endpoint') endpoint?: string) {
    return this.notifications.removePushSubscription(req.user.id, endpoint)
  }

  @Post('test')
  @UseGuards(CsrfGuard)
  test(@Request() req: any) {
    return this.notifications.sendTestPush(req.user.id)
  }
}
