import { Body, Controller, ForbiddenException, Get, Headers, HttpCode, Logger, Post, Request, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CsrfGuard } from '../auth/guards/csrf.guard'
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
  @UseGuards(JwtAuthGuard, CsrfGuard)
  async tokenize(@Request() req: any, @Body() body: TokenizeCreditCardInput) {
    const payload = body as TokenizeCreditCardInput & Record<string, any>
    const card = payload.creditCard ?? payload
    const holder = payload.creditCardHolderInfo ?? payload
    const remoteIp = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim()
      || req.ip
      || req.socket?.remoteAddress
      || '0.0.0.0'
    const creditCardHolderInfo = {
      name: holder.name?.trim() || card.holderName?.trim(),
      email: holder.email?.trim() || req.user.email,
      cpfCnpj: holder.cpfCnpj?.replace(/\D/g, ''),
      postalCode: holder.postalCode?.replace(/\D/g, ''),
      addressNumber: holder.addressNumber?.trim(),
      phone: holder.phone?.replace(/\D/g, ''),
    }
    const customerId = await this.asaas.createCustomer({
      ...req.user,
      cpfCnpj: req.user.cpfCnpj || creditCardHolderInfo.cpfCnpj,
    })

    const creditCardToken = await this.asaas.tokenizeCreditCard({
      customerId,
      remoteIp,
      creditCard: {
        holderName: card.holderName?.trim(),
        number: card.number?.replace(/\D/g, ''),
        expiryMonth: card.expiryMonth,
        expiryYear: card.expiryYear,
        ccv: card.ccv?.replace(/\D/g, ''),
      },
      creditCardHolderInfo,
    })

    return { creditCardToken }
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard, CsrfGuard)
  subscribe(
    @Request() req: any,
    @Body('plan') plan?: string,
    @Body('creditCardToken') creditCardToken?: string,
  ) {
    return this.billing.subscribe(req.user, plan, creditCardToken)
  }

  @Post('free')
  @UseGuards(JwtAuthGuard, CsrfGuard)
  activateFree(@Request() req: any) {
    return this.billing.activateFree(req.user)
  }

  @Post('update-card')
  @UseGuards(JwtAuthGuard, CsrfGuard)
  updateCard(@Request() req: any, @Body('creditCardToken') creditCardToken?: string) {
    return this.billing.updateCard(req.user.id, creditCardToken)
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard, CsrfGuard)
  cancel(@Request() req: any) {
    return this.billing.cancel(req.user)
  }

  @Get('metrics')
  @UseGuards(JwtAuthGuard)
  metrics(@Request() req: any) {
    if (!this.isMetricsAdmin(req.user?.email)) {
      throw new ForbiddenException('Acesso restrito')
    }
    return this.billing.getMetrics()
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Request() req: any) {
    return this.billing.getMine(req.user)
  }

  private isMetricsAdmin(email?: string): boolean {
    const admins = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map(value => value.trim().toLowerCase())
      .filter(Boolean)
    return !!email && admins.includes(email.toLowerCase())
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
