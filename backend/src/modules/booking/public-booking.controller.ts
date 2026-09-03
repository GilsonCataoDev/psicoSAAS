import { Body, Controller, Delete, Get, Header, Param, Post, Query, Req, Res } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { Request, Response } from 'express'
import { BookingService } from './booking.service'
import { CreateBookingDto } from './dto/create-booking.dto'
import { BookingContactMemoryService } from './booking-contact-memory.service'

const CONTACT_COOKIE = 'usecognia_booking_contact'
const CONTACT_MAX_AGE = 30 * 24 * 60 * 60 * 1000

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
    private contactMemory: BookingContactMemoryService,
  ) {}

  @Get('contact-memory')
  @Header('Cache-Control', 'private, no-store')
  @Throttle({ short: { limit: 20, ttl: 60000 } })
  getContactMemory(@Req() req: Request) {
    return this.contactMemory.preview(req.cookies?.[CONTACT_COOKIE])
  }

  @Delete('contact-memory')
  @Header('Cache-Control', 'private, no-store')
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  async forgetContact(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.contactMemory.forget(req.cookies?.[CONTACT_COOKIE])
    res.clearCookie(CONTACT_COOKIE, contactCookieOptions())
    return { ok: true }
  }

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
  @Header('Cache-Control', 'private, no-store')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  async createBooking(
    @Param('slug') slug: string,
    @Body() dto: CreateBookingDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const previousToken = req.cookies?.[CONTACT_COOKIE]
    const result = await this.svc.createBooking(slug, dto, previousToken)
    if (result.rememberToken) {
      await this.contactMemory.forget(previousToken)
      res.cookie(CONTACT_COOKIE, result.rememberToken, {
        ...contactCookieOptions(),
        maxAge: CONTACT_MAX_AGE,
      })
    }
    const { rememberToken: _token, rememberExpiresAt: _expiry, ...safe } = result
    return safe
  }

  /** GET /api/public/booking/confirm/:token — paciente confirma via link */
  @Get('confirm/:token')
  @Header('Cache-Control', 'private, no-store')
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  confirm(@Param('token') token: string) {
    return this.svc.confirmByToken(token)
  }

  /** GET /api/public/booking/cancel/:token — valida link sem cancelar */
  @Get('cancel/:token')
  @Header('Cache-Control', 'private, no-store')
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  getCancel(@Param('token') token: string) {
    return this.svc.getCancellationPreview(token)
  }

  /** POST /api/public/booking/cancel/:token — paciente confirma cancelamento */
  @Post('cancel/:token')
  @Header('Cache-Control', 'private, no-store')
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  cancel(@Param('token') token: string, @Query('reason') reason?: string) {
    return this.svc.cancelByToken(token, reason)
  }
}

function contactCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/api/public/booking',
  }
}
