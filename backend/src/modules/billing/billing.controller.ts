import { Body, Controller, Get, Headers, HttpCode, Logger, Post, Request, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { NoImpersonationGuard } from '../../common/guards/no-impersonation.guard'
import { AdminGuard } from '../../common/guards/admin.guard'
import { AsaasService } from './asaas.service'
import { BillingWebhookService } from './billing-webhook.service'
import { BillingService } from './billing.service'
import {
  PaidPlanDto,
  SubscribeDto,
  TokenizeCreditCardDto,
  UpdateCardDto,
} from './dto/billing-actions.dto'

@Controller('billing')
export class BillingController {
  private readonly logger = new Logger(BillingController.name)

  constructor(
    private readonly billing: BillingService,
    private readonly asaas: AsaasService,
    private readonly webhooks: BillingWebhookService,
  ) {}

  @Post('tokenize')
  @UseGuards(JwtAuthGuard, CsrfGuard, NoImpersonationGuard)
  async tokenize(@Request() req: any, @Body() body: TokenizeCreditCardDto) {
    const card = body.creditCard
    const holder = body.creditCardHolderInfo
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
  @UseGuards(JwtAuthGuard, CsrfGuard, NoImpersonationGuard)
  subscribe(
    @Request() req: any,
    @Body() body: SubscribeDto,
  ) {
    return this.billing.subscribe(req.user, body.plan, body.creditCardToken)
  }

  @Post('free')
  @UseGuards(JwtAuthGuard, CsrfGuard)
  activateFree(@Request() req: any) {
    return this.billing.activateFree(req.user)
  }

  @Post('update-card')
  @UseGuards(JwtAuthGuard, CsrfGuard, NoImpersonationGuard)
  updateCard(
    @Request() req: any,
    @Body() body: UpdateCardDto,
  ) {
    return this.billing.updateCard(req.user.id, body.creditCardToken, body.plan)
  }

  @Post('change-plan')
  @UseGuards(JwtAuthGuard, CsrfGuard, NoImpersonationGuard)
  changePlan(@Request() req: any, @Body() body: PaidPlanDto) {
    return this.billing.changePlan(req.user, body.plan)
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard, CsrfGuard, NoImpersonationGuard)
  cancel(@Request() req: any) {
    return this.billing.cancel(req.user)
  }

  @Get('metrics')
  @UseGuards(JwtAuthGuard, AdminGuard)
  metrics() {
    return this.billing.getMetrics()
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Request() req: any) {
    return this.billing.getMine(req.user)
  }

  @Get('upgrade-offer')
  @UseGuards(JwtAuthGuard)
  upgradeOffer(@Request() req: any) {
    return this.billing.getFreeUpgradeOffer(req.user)
  }

  @Post('upgrade-offer/viewed')
  @UseGuards(JwtAuthGuard, CsrfGuard)
  acknowledgeUpgradeOffer(@Request() req: any) {
    return this.billing.acknowledgeFreeUpgradeOffer(req.user.id)
  }

  @Post('webhook')
  @HttpCode(200)
  @Throttle({ short: { limit: 60, ttl: 60 * 1000 } })
  async webhook(@Headers() headers: Record<string, any>, @Body() body: any) {
    if (!this.webhooks.isValidOrigin(headers, body)) {
      this.logger.warn('[Asaas webhook] Origem inválida — ignorando silenciosamente')
      return { received: false }
    }

    // Só confirma o recebimento depois de persistir o evento e atualizar a assinatura.
    await this.webhooks.process(body)

    return { received: true }
  }
}
