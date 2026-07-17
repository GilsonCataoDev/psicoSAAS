import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { BookingService } from './booking.service'
import { CreateBookingDto } from './dto/create-booking.dto'
import { PosthogService } from '../posthog/posthog.service'

/**
 * Rotas públicas — sem autenticação.
 * Acessadas pelo paciente na página de agendamento.
 *
 * Rate limit próprio mais restritivo que o global (100/min):
 *  - GET de dados/slots: 30/min por IP
 *  - POST de agendamento: 5/min por IP (previne flood)
 *  - Confirmação/cancelamento: 10/min por IP
 */
@Controller('public/booking')
export class PublicBookingController {
  constructor(
    private svc: BookingService,
    private posthog: PosthogService,
  ) {}

  /** GET /api/public/booking/:slug — dados da página pública */
  @Get(':slug')
  @Throttle({ short: { limit: 30, ttl: 60000 } })
  getPage(@Param('slug') slug: string) {
    return this.svc.getPublicPage(slug)
  }

  /** GET /api/public/booking/:slug/slots?date=2024-12-01 — horários disponíveis */
  @Get(':slug/slots')
  @Throttle({ short: { limit: 30, ttl: 60000 } })
  getSlots(
    @Param('slug') slug: string,
    @Query('date') date: string,
    @Query('modality') modality?: 'presencial' | 'online',
  ) {
    return this.svc.getAvailableSlots(slug, date, modality)
  }

  /** GET /api/public/booking/:slug/dates?month=2026-05&modality=online */
  @Get(':slug/dates')
  @Throttle({ short: { limit: 30, ttl: 60000 } })
  getDates(
    @Param('slug') slug: string,
    @Query('month') month: string,
    @Query('modality') modality?: 'presencial' | 'online',
  ) {
    return this.svc.getAvailableDates(slug, month, modality)
  }

  /** POST /api/public/booking/:slug — criar solicitação de agendamento */
  @Post(':slug')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  async createBooking(@Param('slug') slug: string, @Body() dto: CreateBookingDto) {
    const result = await this.svc.createBooking(slug, dto)
    this.posthog.capture('anonymous', 'booking_request_received', {
      slug,
      modality: (dto as any).modality ?? undefined,
      $process_person_profile: false,
    })
    this.posthog.client.flush().catch(() => {})
    return result
  }

  /** GET /api/public/booking/confirm/:token — paciente confirma via link */
  @Get('confirm/:token')
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  confirm(@Param('token') token: string) {
    return this.svc.confirmByToken(token)
  }

  /** GET /api/public/booking/cancel/:token — valida link sem cancelar */
  @Get('cancel/:token')
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  getCancel(@Param('token') token: string) {
    return this.svc.getCancellationPreview(token)
  }

  /** POST /api/public/booking/cancel/:token — paciente confirma cancelamento */
  @Post('cancel/:token')
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  cancel(@Param('token') token: string, @Query('reason') reason?: string) {
    return this.svc.cancelByToken(token, reason)
  }
}
