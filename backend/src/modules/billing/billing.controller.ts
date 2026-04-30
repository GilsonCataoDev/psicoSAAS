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
  async tokenize(@Body() body: TokenizeCreditCardInput) {
    const creditCardToken = await this.asaas.tokenizeCreditCard({
      holderName: body.holderName,
      number: body.number,
      expiryMonth: body.expiryMonth,
      expiryYear: body.expiryYear,
      ccv: body.ccv,
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

  @Post('update-card')
  @UseGuards(JwtAuthGuard)
  updateCard(@Request() req: any, @Body('creditCardToken') creditCardToken?: string) {
    return this.billing.updateCard(req.user.id, creditCardToken)
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
