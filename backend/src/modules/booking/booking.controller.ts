import {
  Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { BookingService } from './booking.service'
import { SaveBookingPageDto } from './dto/save-booking-page.dto'

/**
 * Rotas autenticadas — painel do psicólogo.
 */
@Controller('booking')
@UseGuards(JwtAuthGuard)
export class BookingController {
  constructor(private svc: BookingService) {}

  /** Listar solicitações de agendamento */
  @Get()
  getMyBookings(@Request() req: any, @Query('status') status?: string) {
    return this.svc.getMyBookings(req.user.id, status)
  }

  /** Confirmar solicitação */
  @Patch(':id/confirm')
  confirm(@Param('id') id: string, @Request() req: any) {
    return this.svc.confirmBooking(id, req.user.id)
  }

  /** Rejeitar / cancelar solicitação */
  @Patch(':id/reject')
  reject(
    @Param('id') id: string,
    @Request() req: any,
    @Body('reason') reason?: string,
  ) {
    return this.svc.rejectBooking(id, req.user.id, reason)
  }

  /** Marcar como pago */
  @Patch(':id/pay')
  markPaid(
    @Param('id') id: string,
    @Request() req: any,
    @Body('method') method: string,
  ) {
    return this.svc.markPaid(id, req.user.id, method)
  }

  /** Obter configurações da página pública */
  @Get('page')
  getPage(@Request() req: any) {
    return this.svc.getMyPage(req.user.id)
  }

  /** Salvar configurações da página pública */
  @Post('page')
  savePage(@Request() req: any, @Body() dto: SaveBookingPageDto) {
    return this.svc.saveMyPage(req.user.id, dto)
  }

  /** Gerar slug sugerido com base no nome */
  @Get('page/slug-suggest')
  suggestSlug(@Request() req: any) {
    return this.svc.generateSlug(req.user.name)
  }
}
