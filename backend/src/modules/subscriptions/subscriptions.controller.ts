import {
  Controller, Post, Get, Delete, Body, Req,
  UseGuards, HttpCode, Headers, RawBodyRequest,
} from '@nestjs/common'
import { Request } from 'express'
import { SkipThrottle, Throttle } from '@nestjs/throttler'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { SubscriptionsService } from './subscriptions.service'
import { AsaasService } from './asaas.service'
import { CreateSubscriptionDto } from './dto/create-subscription.dto'

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private subs: SubscriptionsService,
    private asaas: AsaasService,
  ) {}

  /** Minha assinatura atual */
  @Get('me')
  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: any) {
    return this.subs.getOrCreateTrial(req.user.id)
  }

  /** Criar/trocar assinatura */
  @Post()
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  async subscribe(@Req() req: any, @Body() dto: CreateSubscriptionDto) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
              ?? req.socket?.remoteAddress
              ?? '0.0.0.0'
    return this.subs.subscribe(req.user, dto, ip)
  }

  /** Cancelar assinatura */
  @Delete('me')
  @UseGuards(JwtAuthGuard)
  async cancel(@Req() req: any) {
    return this.subs.cancel(req.user.id)
  }

  /**
   * Webhook Asaas — sem auth, sem throttle (IP whitelist via proxy/nginx se quiser)
   * Asaas envia: access_token no body para validar autenticidade
   */
  @Post('webhook/asaas')
  @SkipThrottle()
  @HttpCode(200)
  async handleWebhook(@Body() body: any) {
    // Valida o token secreto que configuramos no painel Asaas
    if (!this.asaas.validateWebhookToken(body.accessToken)) {
      return { received: false }
    }
    await this.subs.handleWebhook(body)
    return { received: true }
  }
}
