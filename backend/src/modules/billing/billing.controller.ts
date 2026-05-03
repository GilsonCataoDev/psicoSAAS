import { Body, Controller, Get, Headers, HttpCode, Logger, Post, Request, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AsaasService, TokenizeCreditCardInput } from './asaas.service'
import { BillingWebhookService } from './billing-webhook.service'
import { BillingService } from './billing.service'

@Controller('billing')
export class BillingController {
  private readonly logger = new Logger(BillingController.name)

  constructor(
    private readonly billing: BillingService,
    private readonly asaas: AsaasService,
    private readonly webhooks: BillingWebhookService,
  ) {}

  @Post('tokenize')
  @UseGuards(JwtAuthGuard)
  async tokenize(@Request() req: any, @Body() body: TokenizeCreditCardInput) {
    const remoteIp = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim()
      || req.ip
      || req.socket?.remoteAddress
      || '0.0.0.0'

    const creditCardToken = await this.asaas.tokenizeCreditCard(req.user, {
      holderName: body.holderName,
      number: body.number,
      expiryMonth: body.expiryMonth,
      expiryYear: body.expiryYear,
      ccv: body.ccv,
      cpfCnpj: body.cpfCnpj?.replace(/\D/g, ''),
      postalCode: body.postalCode?.replace(/\D/g, ''),
      addressNumber: body.addressNumber,
      phone: body.phone?.replace(/\D/g, ''),
      email: req.user.email,
      remoteIp,
    })

    return { creditCardToken }
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  subscribe(
    @Request() req: any,
    @Body('plan') plan?: string,
    @Body('creditCardToken') creditCardToken?: string,
  ) {
    return this.billing.subscribe(req.user, plan, creditCardToken)
  }

  @Post('free')
  @UseGuards(JwtAuthGuard)
  activateFree(@Request() req: any) {
    return this.billing.activateFree(req.user.id)
  }

  @Post('update-card')
  @UseGuards(JwtAuthGuard)
  updateCard(@Request() req: any, @Body('creditCardToken') creditCardToken?: string) {
    return this.billing.updateCard(req.user.id, creditCardToken)
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  cancel(@Request() req: any) {
    return this.billing.cancel(req.user.id)
  }

  @Get('metrics')
  @UseGuards(JwtAuthGuard)
  metrics() {
    return this.billing.getMetrics()
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Request() req: any) {
    return this.billing.getMine(req.user.id)
  }

  @Post('webhook')
  @HttpCode(200)
  webhook(@Headers() headers: Record<string, any>, @Body() body: any) {
    if (!this.webhooks.isValidOrigin(headers, body)) {
      this.logger.warn('[Asaas webhook] Origem inválida')
      return { received: false }
    }

    this.webhooks.process(body).catch((err) => {
      this.logger.error('[Asaas webhook] Erro assíncrono', err)
    })

    return { received: true }
  }
}
