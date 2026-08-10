import { Controller, Get, Headers, HttpCode, Post, Query, RawBodyRequest, Req, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { createHmac, timingSafeEqual } from 'crypto'
import { Request } from 'express'
import { Repository } from 'typeorm'
import { PublicRoute } from '../../common/decorators/public-route.decorator'
import { WhatsAppOutbox, WhatsAppOutboxStatus } from './entities/whatsapp-outbox.entity'

@PublicRoute()
@Controller('notifications/whatsapp/cloud/webhook')
export class WhatsAppCloudWebhookController {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(WhatsAppOutbox) private readonly outbox: Repository<WhatsAppOutbox>,
  ) {}

  @Get()
  verify(
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') token?: string,
    @Query('hub.challenge') challenge?: string,
  ): string {
    if (mode !== 'subscribe' || !this.safeEqual(token ?? '', this.config.get<string>('WHATSAPP_CLOUD_VERIFY_TOKEN') ?? '')) {
      throw new UnauthorizedException('Webhook invalido')
    }
    return challenge ?? ''
  }

  @Post()
  @HttpCode(200)
  async receive(
    @Req() request: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature?: string,
  ): Promise<{ received: true }> {
    this.assertSignature(request.rawBody, signature)
    const statuses = (request.body as any)?.entry?.flatMap((entry: any) =>
      entry?.changes?.flatMap((change: any) => change?.value?.statuses ?? []) ?? [],
    ) ?? []
    for (const item of statuses) {
      if (!item?.id || !['sent', 'delivered', 'read', 'failed'].includes(item.status)) continue
      const entity = await this.outbox.findOne({ where: { providerMessageId: item.id } })
      if (!entity) continue
      entity.status = this.nextStatus(entity.status, item.status)
      entity.providerStatus = item.status
      entity.lastError = item.status === 'failed' ? String(item?.errors?.[0]?.title ?? 'Falha informada pela Cloud API').slice(0, 240) : null
      await this.outbox.save(entity)
    }
    return { received: true }
  }

  private assertSignature(rawBody?: Buffer, signature?: string): void {
    const secret = this.config.get<string>('WHATSAPP_CLOUD_APP_SECRET') ?? ''
    if (!secret || !rawBody || !signature?.startsWith('sha256=')) throw new UnauthorizedException('Assinatura ausente')
    const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`
    if (!this.safeEqual(signature, expected)) throw new UnauthorizedException('Assinatura invalida')
  }

  private safeEqual(left: string, right: string): boolean {
    const a = Buffer.from(left)
    const b = Buffer.from(right)
    return a.length === b.length && timingSafeEqual(a, b)
  }

  private nextStatus(current: WhatsAppOutboxStatus, incoming: string): WhatsAppOutboxStatus {
    if (incoming === 'failed') return 'failed'
    const mapped = incoming === 'sent' ? 'accepted' : incoming as WhatsAppOutboxStatus
    const order: WhatsAppOutboxStatus[] = ['pending', 'sending', 'accepted', 'delivered', 'read']
    return order.indexOf(mapped) > order.indexOf(current) ? mapped : current
  }
}
