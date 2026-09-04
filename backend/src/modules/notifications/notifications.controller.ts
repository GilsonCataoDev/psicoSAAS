import { BadRequestException, Body, Controller, Delete, Get, Post, Request, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { RequirePlan } from '../../common/decorators/require-plan.decorator'
import { AdminGuard } from '../../common/guards/admin.guard'
import { NoImpersonationGuard } from '../../common/guards/no-impersonation.guard'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { NotificationsService } from './notifications.service'
import { RemovePushSubscriptionDto, SavePushSubscriptionDto } from './dto/push-subscription.dto'
import { RegisterNativePushTokenDto, RemoveNativePushTokenDto } from './dto/native-push-token.dto'
import { TestWhatsAppDto } from './dto/test-whatsapp.dto'

@Controller('notifications/whatsapp')
@UseGuards(JwtAuthGuard, NoImpersonationGuard)
@RequirePlan('pro')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('status')
  status(@Request() req: any) {
    return this.notifications.getWhatsAppStatus(req.user.id)
  }

  @Get('logs')
  logs(@Request() req: any) {
    return this.notifications.getWhatsAppLogs(req.user.id)
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
  test(@Request() req: any, @Body() body: TestWhatsAppDto) {
    return this.notifications.sendTestWhatsApp(req.user.id, body.phone)
  }

  @Post('reengagement')
  @UseGuards(CsrfGuard)
  @Throttle({ default: { limit: 2, ttl: 60 * 60 * 1000 } })
  reengagement(
    @Request() req: any,
    @Body() body: { monthsSince: number; template: string },
  ) {
    if (!body.template?.trim()) throw new BadRequestException('Template ausente')
    if (body.template.length > 1000) throw new BadRequestException('Template muito longo (máx 1000 chars)')
    return this.notifications.sendReengagement(req.user.id, body.monthsSince ?? 3, body.template)
  }

  @Get('debug')
  @UseGuards(AdminGuard)
  @Throttle({ long: { limit: 10, ttl: 60 * 1000 } })
  debug(@Request() req: any) {
    return this.notifications.debugWhatsApp(req.user.id)
  }
}

@Controller('notifications/push')
@UseGuards(JwtAuthGuard)
export class PushNotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('status')
  status(@Request() req: any) {
    return this.notifications.getPushStatus(req.user.id)
  }

  @Post('subscribe')
  @UseGuards(CsrfGuard)
  subscribe(@Request() req: any, @Body() dto: SavePushSubscriptionDto) {
    return this.notifications.savePushSubscription(req.user.id, dto, req.headers['user-agent'])
  }

  @Delete('unsubscribe')
  @UseGuards(CsrfGuard)
  unsubscribe(@Request() req: any, @Body() dto: RemovePushSubscriptionDto) {
    return this.notifications.removePushSubscription(req.user.id, dto.endpoint)
  }

  @Post('test')
  @UseGuards(CsrfGuard)
  test(@Request() req: any) {
    return this.notifications.sendTestPush(req.user.id)
  }

  @Post('native-token')
  @UseGuards(CsrfGuard)
  registerNativeToken(@Request() req: any, @Body() dto: RegisterNativePushTokenDto) {
    return this.notifications.registerNativePushToken(req.user.id, dto)
  }

  @Delete('native-token')
  @UseGuards(CsrfGuard)
  removeNativeToken(@Request() req: any, @Body() dto: RemoveNativePushTokenDto) {
    return this.notifications.removeNativePushToken(req.user.id, dto.token)
  }
}
