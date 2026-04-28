import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common'
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
}
