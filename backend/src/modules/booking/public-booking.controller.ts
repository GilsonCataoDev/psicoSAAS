import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { BookingService } from './booking.service'
import { CreateBookingDto } from './dto/create-booking.dto'

/**
 * Rotas públicas — sem autenticação.
 * Acessadas pelo paciente na página de agendamento.
 */
@Controller('public/booking')
export class PublicBookingController {
  constructor(private svc: BookingService) {}

  /** GET /api/public/booking/:slug — dados da página pública */
  @Get(':slug')
  getPage(@Param('slug') slug: string) {
    return this.svc.getPublicPage(slug)
  }

  /** GET /api/public/booking/:slug/slots?date=2024-12-01 — horários disponíveis */
  @Get(':slug/slots')
  getSlots(@Param('slug') slug: string, @Query('date') date: string) {
    return this.svc.getAvailableSlots(slug, date)
  }

  /** POST /api/public/booking/:slug — criar solicitação de agendamento */
  @Post(':slug')
  createBooking(@Param('slug') slug: string, @Body() dto: CreateBookingDto) {
    return this.svc.createBooking(slug, dto)
  }

  /** GET /api/public/booking/confirm/:token — paciente confirma via link */
  @Get('confirm/:token')
  confirm(@Param('token') token: string) {
    return this.svc.confirmByToken(token)
  }

  /** GET /api/public/booking/cancel/:token — paciente cancela via link */
  @Get('cancel/:token')
  cancel(@Param('token') token: string, @Query('reason') reason?: string) {
    return this.svc.cancelByToken(token, reason)
  }
}
