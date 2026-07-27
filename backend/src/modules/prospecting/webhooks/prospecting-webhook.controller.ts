import { BadRequestException, Body, CanActivate, Controller, ExecutionContext, Headers, Logger, Post, UseGuards } from '@nestjs/common'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import { ProspectingMessageService } from '../messages/prospecting-message.service'

export class WebhookAuthGuard implements CanActivate {
  private readonly logger = new Logger(WebhookAuthGuard.name)

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const authHeader = request.headers.authorization

    if (!authHeader) {
      this.logger.warn('webhook_no_auth')
      throw new BadRequestException('Missing authorization header')
    }

    const [scheme, token] = authHeader.split(' ')
    if (scheme !== 'Bearer' || !token) {
      this.logger.warn('webhook_invalid_auth_scheme')
      throw new BadRequestException('Invalid authorization scheme')
    }

    const expectedSecret = process.env.PROSPECTING_WEBHOOK_SECRET
    if (!expectedSecret) {
      this.logger.warn('webhook_secret_not_configured')
      throw new BadRequestException('Webhook not configured')
    }

    if (token !== expectedSecret) {
      this.logger.warn('webhook_invalid_token')
      throw new BadRequestException('Invalid token')
    }

    return true
  }
}

@Controller('webhooks/prospecting')
@UseGuards(WebhookAuthGuard, ThrottlerGuard)
export class ProspectingWebhookController {
  private readonly logger = new Logger(ProspectingWebhookController.name)

  constructor(private readonly messageSvc: ProspectingMessageService) {}

  @Post('inbound')
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async receiveInbound(
    @Body() dto: any,
    @Headers('authorization') authHeader: string,
  ) {
    const { conversationId, content, providerMessageId, channel } = dto

    if (!conversationId || !content) {
      throw new BadRequestException('Missing conversationId or content')
    }

    this.logger.debug(`webhook_inbound conversationId=${conversationId} channel=${channel}`)

    const result = await this.messageSvc.autoClassifyAndHandle(
      conversationId,
      content,
      providerMessageId,
      null,
    )

    return {
      success: true,
      messageId: result.message.id,
      classification: result.classification,
    }
  }
}
