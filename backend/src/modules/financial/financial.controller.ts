import {
  Body, Controller, Delete, Get, Headers, HttpCode,
  Param, Patch, Post, Query, Request, UseGuards,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { NoImpersonationGuard } from '../../common/guards/no-impersonation.guard'
import { FinancialService } from './financial.service'
import { CreateFinancialDto } from './dto/create-financial.dto'
import { MarkPaidDto } from './dto/mark-paid.dto'
import { CreateRecurringExpenseDto, UpdateRecurringExpenseDto } from './dto/recurring-expense.dto'
import { RequirePlan } from '../../common/decorators/require-plan.decorator'
import { secretsMatch } from '../../common/crypto/encrypt.util'

@Controller('financial')
@UseGuards(JwtAuthGuard, CsrfGuard, NoImpersonationGuard)
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

  @Get('report')
  report(@Request() req: any, @Query('month') month: string) {
    return this.svc.getMonthlyReport(req.user.id, month)
  }

  @Post()
  create(@Body() dto: CreateFinancialDto, @Request() req: any) {
    return this.svc.create(dto, req.user.id)
  }

  @Patch(':id/pay')
  markPaid(
    @Param('id') id: string,
    @Body() dto: MarkPaidDto,
    @Request() req: any,
  ) {
    return this.svc.markPaid(id, dto.method, req.user.id)
  }

  @Post(':id/send-charge')
  @RequirePlan('pro')
  sendCharge(@Param('id') id: string, @Request() req: any) {
    return this.svc.sendChargeMessage(id, req.user.id)
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.svc.remove(id, req.user.id)
  }

  @Get('recurring-expenses')
  findRecurringExpenses(@Request() req: any) {
    return this.svc.findRecurringExpenses(req.user.id)
  }

  @Post('recurring-expenses')
  createRecurringExpense(@Body() dto: CreateRecurringExpenseDto, @Request() req: any) {
    return this.svc.createRecurringExpense(dto, req.user.id)
  }

  @Patch('recurring-expenses/:id')
  updateRecurringExpense(@Param('id') id: string, @Body() dto: UpdateRecurringExpenseDto, @Request() req: any) {
    return this.svc.updateRecurringExpense(id, dto, req.user.id)
  }

  @Delete('recurring-expenses/:id')
  deleteRecurringExpense(@Param('id') id: string, @Request() req: any) {
    return this.svc.deleteRecurringExpense(id, req.user.id)
  }
}

// Rota separada, fora do guard JWT
@Controller('webhooks/asaas')
export class AsaasWebhookController {
  constructor(private svc: FinancialService) {}

  @Post()
  @HttpCode(200)
  @Throttle({ short: { limit: 60, ttl: 60 * 1000 } })
  async handle(
    @Headers('asaas-access-token') token: string,
    @Body() body: { event: string; payment: any },
  ) {
    const expected = process.env.ASAAS_WEBHOOK_TOKEN
    if (!secretsMatch(token, expected)) return { ok: false } // Sem segredo configurado, o webhook não é processado.

    await this.svc.handleAsaasWebhook(body.event, body.payment)
    return { ok: true }
  }
}
