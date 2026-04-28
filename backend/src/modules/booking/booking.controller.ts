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

  /** Link diário rotativo — gera token válido por 24h (renova à meia-noite UTC) */
  @Get('daily-link')
  getDailyLink(@Request() req: any) {
    const baseUrl = process.env.FRONTEND_URL ?? 'https://gilsoncataodev.github.io/psicoSAAS'
    return this.svc.getDailyLink(req.user.id, baseUrl)
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

  /**
   * Sincroniza bookings confirmados sem Appointment correspondente.
   * Útil para corrigir bookings confirmados antes da integração automática.
   */
  @Post('sync-appointments')
  syncAppointments(@Request() req: any) {
    return this.svc.syncConfirmedBookings(req.user.id)
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
}
