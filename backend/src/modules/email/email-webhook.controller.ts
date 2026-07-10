import { BadRequestException, Controller, Headers, HttpCode, Post, Req } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { Request } from 'express'
import { PublicRoute } from '../../common/decorators/public-route.decorator'
import { EmailWebhookService } from './email-webhook.service'

@Controller('email')
export class EmailWebhookController {
  constructor(private readonly webhooks: EmailWebhookService) {}

  @PublicRoute()
  @Post('webhook')
  @HttpCode(200)
  @Throttle({ short: { limit: 60, ttl: 60 * 1000 } })
  async webhook(@Req() req: Request, @Headers() headers: Record<string, string>) {
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody
    if (!rawBody) throw new BadRequestException('Corpo da requisição ausente')

    const event = this.webhooks.verify(rawBody.toString('utf8'), headers)
    if (!event) return { received: false }

    await this.webhooks.process(event)
    return { received: true }
  }
}
