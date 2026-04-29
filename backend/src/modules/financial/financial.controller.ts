import {
  Body, Controller, Delete, Get, Headers, HttpCode,
  Param, Patch, Post, Query, Request, UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { FinancialService } from './financial.service'
import { CreateFinancialDto } from './dto/create-financial.dto'

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
  sendCharge(@Param('id') id: string, @Request() req: any) {
    return this.svc.sendChargeMessage(id, req.user.id)
  }

  /**
   * Gera (ou reutiliza) um link de pagamento Asaas para o paciente.
   * O psicólogo precisa ter configurado preferences.asaasApiKey nas configurações.
   */
  @Post(':id/payment-link')
  generatePaymentLink(@Param('id') id: string, @Request() req: any) {
    return this.svc.generatePaymentLink(id, req.user.id)
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
