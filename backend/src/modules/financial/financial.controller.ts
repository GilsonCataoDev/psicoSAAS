import {
  Body, Controller, Delete, Get, Headers, HttpCode, Ip,
  Param, Patch, Post, Query, Request, UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { FinancialService } from './financial.service'
import { CreateFinancialDto } from './dto/create-financial.dto'
import { ChargeCardDto } from './dto/charge-card.dto'
import { RequirePlan } from '../../common/decorators/require-plan.decorator'

@Controller('financial')
@UseGuards(JwtAuthGuard)
export class FinancialController {
  constructor(private svc: FinancialService) {}

  @Get()
  findAll(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('patientId') patientId?: string,
  ) {
    return this.svc.findAll(req.user.id, status, patientId)
  }

  @Get('summary')
  summary(@Request() req: any) { return this.svc.getSummary(req.user.id) }

  @Post()
  create(@Body() dto: CreateFinancialDto, @Request() req: any) {
    return this.svc.create(dto, req.user.id)
  }

  @Patch(':id/pay')
  markPaid(
    @Param('id') id: string,
    @Body('method') method: string,
    @Request() req: any,
  ) {
    return this.svc.markPaid(id, method, req.user.id)
  }

  /** Envia cobrança via WhatsApp usando PIX das preferências do psicólogo */
  @Post(':id/send-charge')
  @RequirePlan('pro')
  sendCharge(@Param('id') id: string, @Request() req: any) {
    return this.svc.sendChargeMessage(id, req.user.id)
  }

  /**
   * Gera (ou reutiliza) um link de pagamento Asaas para o paciente.
   * O psicólogo precisa ter configurado preferences.asaasApiKey nas configurações.
   */
  @Post(':id/payment-link')
  @RequirePlan('pro')
  generatePaymentLink(@Param('id') id: string, @Request() req: any) {
    return this.svc.generatePaymentLink(id, req.user.id)
  }

  /**
   * Cobra diretamente por cartão de crédito via Asaas (tokenização + cobrança).
   * remoteIp é extraído do request para atender ao antifraude do Asaas.
   */
  @Post(':id/charge-card')
  @RequirePlan('pro')
  chargeWithCard(
    @Param('id') id: string,
    @Body() dto: ChargeCardDto,
    @Request() req: any,
    @Ip() ip: string,
  ) {
    // Em produção com proxy (Railway/Nginx), o IP real vem no X-Forwarded-For
    const remoteIp = (req.headers['x-forwarded-for'] as string)
      ?.split(',')[0]?.trim()
      ?? ip
      ?? '177.0.0.1'
    return this.svc.chargeWithCard(id, req.user.id, dto, remoteIp)
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.svc.remove(id, req.user.id)
  }
}

// ─── Webhook público do Asaas ────────────────────────────────────────────────
// Rota separada, fora do guard JWT
@Controller('webhooks/asaas')
export class AsaasWebhookController {
  constructor(private svc: FinancialService) {}

  @Post()
  @HttpCode(200)
  async handle(
    @Headers('asaas-access-token') token: string,
    @Body() body: { event: string; payment: any },
  ) {
    // Validação básica: o token deve bater com a variável de ambiente
    const expected = process.env.ASAAS_WEBHOOK_TOKEN
    if (expected && token !== expected) return { ok: false }

    await this.svc.handleAsaasWebhook(body.event, body.payment)
    return { ok: true }
  }
}
