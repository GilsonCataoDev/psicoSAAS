import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
  Logger,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Between, DataSource, In, IsNull, Not, Repository } from 'typeorm'
import { randomBytes, createHmac } from 'crypto'
import { ConfigService } from '@nestjs/config'
import {
  addDays, format, parseISO, setHours, setMinutes,
  addMinutes, isBefore, isAfter, getDay, eachDayOfInterval,
  addMonths, endOfMonth, startOfMonth,
} from 'date-fns'
import { Booking } from './entities/booking.entity'
import { BookingPage } from './entities/booking-page.entity'
import { Patient } from '../patients/entities/patient.entity'
import { Appointment } from '../appointments/entities/appointment.entity'
import { FinancialRecord } from '../financial/entities/financial-record.entity'
import { User } from '../auth/entities/user.entity'
import { Session } from '../sessions/entities/session.entity'
import { AvailabilityService } from '../availability/availability.service'
import { NotificationsService } from '../notifications/notifications.service'
import { CreateBookingDto } from './dto/create-booking.dto'
import { SaveBookingPageDto } from './dto/save-booking-page.dto'
import { GoogleCalendarService } from '../google-calendar/google-calendar.service'

const OCCUPYING_BOOKING_STATUSES: Booking['status'][] = ['pending', 'confirmed']
const FREE_APPOINTMENT_STATUSES = ['cancelled', 'no_show']
const BOOKING_TIME_ZONE = 'America/Sao_Paulo'

function slugifyName(value?: string | null): string {
  const meaningfulParts = (value ?? '')
    .trim()
    .split(/\s+/)
    .filter(part => part.length > 1)
    .slice(0, 2)
    .join(' ')

  const slug = meaningfulParts
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 54)
    .replace(/-+$/g, '')

  return slug || 'psi'
}

function saoPauloDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BOOKING_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const value = (type: string) => parts.find(part => part.type === type)?.value
  return `${value('year')}-${value('month')}-${value('day')}`
}

function nextSaoPauloMidnight(date = new Date()): Date {
  const [year, month, day] = saoPauloDateKey(date).split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + 1, 3, 0, 0))
}

function getMaxAdvanceDate(today: Date, maxAdvanceDays: number): Date {
  const days = Number(maxAdvanceDays)
  if (days > 0 && days % 30 === 0) {
    return endOfMonth(addMonths(startOfMonth(today), days / 30))
  }
  return addDays(today, days)
}

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name)

  constructor(
    @InjectRepository(Booking)         private bookings:     Repository<Booking>,
    @InjectRepository(BookingPage)     private pages:        Repository<BookingPage>,
    @InjectRepository(Patient)         private patients:     Repository<Patient>,
    @InjectRepository(Appointment)     private appointments: Repository<Appointment>,
    @InjectRepository(FinancialRecord) private financial:    Repository<FinancialRecord>,
    @InjectRepository(User)            private users:        Repository<User>,
    @InjectRepository(Session)         private sessions:     Repository<Session>,
    private availability:  AvailabilityService,
    private notifications: NotificationsService,
    private googleCalendar: GoogleCalendarService,
    private config:        ConfigService,
    private dataSource:    DataSource,
  ) {}

  // ─── Daily token helpers ────────────────────────────────────────────────────

  /**
   * Gera o token diário de 16 chars para o link público.
   * Formato: {userId sem dashes, primeiros 8 chars}{HMAC(secret, userId:YYYY-MM-DD), primeiros 8 chars hex}
   * Rotaciona à meia-noite de Sao Paulo.
   */
  generateDailyToken(userId: string): string {
    const secret = this.config.get<string>('SIGN_SECRET') ?? 'fallback-secret'
    const today = saoPauloDateKey()
    const userPrefix = userId.replace(/-/g, '').slice(0, 8)        // 8 hex chars
    const hmac = createHmac('sha256', secret)
    hmac.update(`${userId}:${today}`)
    const sig = hmac.digest('hex').slice(0, 8)                     // 8 hex chars
    return `${userPrefix}${sig}`                                    // 16 chars total
  }

  /**
   * Resolve um token diário para a BookingPage correspondente.
   * Retorna null se o token for inválido ou expirado.
   */
  async resolveDailyToken(token: string): Promise<BookingPage | null> {
    if (!/^[0-9a-f]{16}$/.test(token)) return null

    const userPrefix = token.slice(0, 8)
    const secret = this.config.get<string>('SIGN_SECRET') ?? 'fallback-secret'
    const today = saoPauloDateKey()

    // Filtra no banco pelo prefixo embutido no token; evita carregar todas as páginas ativas.
    const pages = await this.pages.createQueryBuilder('page')
      .leftJoinAndSelect('page.psychologist', 'psychologist')
      .where('page.isActive = true')
      .andWhere(
        `LEFT(REPLACE("page"."psychologistId"::text, '-', ''), 8) = :userPrefix`,
        { userPrefix },
      )
      .getMany()

    for (const page of pages) {
      // Compara prefixo do userId (8 primeiros hex chars sem dashes)
      const pPrefix = page.psychologistId.replace(/-/g, '').slice(0, 8)
      if (pPrefix !== userPrefix) continue

      // Verifica HMAC para o dia atual
      const hmac = createHmac('sha256', secret)
      hmac.update(`${page.psychologistId}:${today}`)
      const expectedSig = hmac.digest('hex').slice(0, 8)
      if (token.slice(8) === expectedSig) return page
    }
    return null
  }

  // ─── Página pública ────────────────────────────────────────────────────────

  /**
   * Aceita tanto o slug estático quanto o token diário rotativo.
   */
  async getPublicPage(slugOrToken: string) {
    // Tenta token diário primeiro (16 chars hex)
    let page: BookingPage | null = null
    if (/^[0-9a-f]{16}$/.test(slugOrToken)) {
      page = await this.resolveDailyToken(slugOrToken)
    }

    // Fallback: slug estático
    if (!page) {
      page = await this.pages.findOne({
        where: { slug: slugOrToken, isActive: true },
        relations: ['psychologist'],
      })
    }

    if (!page) throw new NotFoundException('Página de agendamento não encontrada')

    const { psychologist, ...pageData } = page
    return {
      ...pageData,
      avatarUrl: page.avatarUrl ?? psychologist.avatarUrl ?? null,
      psychologistName: psychologist.name,
      psychologistCrp: psychologist.crp,
      specialty: psychologist.specialty,
      psychologistPhone: psychologist.phone ?? null,
    }
  }

  async getAvailableSlots(slugOrToken: string, dateStr: string, modality?: 'presencial' | 'online') {
    let page: BookingPage | null = null
    if (/^[0-9a-f]{16}$/.test(slugOrToken)) {
      page = await this.resolveDailyToken(slugOrToken)
    }
    if (!page) {
      page = await this.pages.findOne({ where: { slug: slugOrToken, isActive: true } })
    }
    if (!page) throw new NotFoundException()
    if (modality === 'presencial' && !page.allowPresencial) return []
    if (modality === 'online' && !page.allowOnline) return []
    const sessionDuration = this.getSessionDuration(page, modality)
    const stepMinutes = this.getStepMinutes(page, modality)
    if (sessionDuration <= 0 || stepMinutes <= 0) return []

    const date = parseISO(dateStr)
    const weekday = getDay(date)

    const slots = await this.availability.getSlotsForDay(page.psychologistId, weekday, modality)
    if (!slots.length) return []

    const isBlocked = await this.availability.isDateBlocked(page.psychologistId, dateStr)
    if (isBlocked) return []

    const now = new Date()
    const timeZone = this.config.get<string>('GOOGLE_CALENDAR_TIMEZONE') ?? 'America/Sao_Paulo'
    const todayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now)
    const today = parseISO(todayStr)
    const minDate = addDays(today, page.minAdvanceDays ?? 0)
    const maxDate = getMaxAdvanceDate(today, page.maxAdvanceDays)
    if (isBefore(date, minDate) || isAfter(date, maxDate)) return []

    const [existingBookings, existingAppointments] = await Promise.all([
      this.bookings.find({
        where: {
          psychologistId: page.psychologistId,
          date: dateStr,
          status: In(OCCUPYING_BOOKING_STATUSES),
        },
      }),
      this.appointments.find({
        where: {
          psychologistId: page.psychologistId,
          date: dateStr,
          status: Not(In(FREE_APPOINTMENT_STATUSES)),
        },
      }),
    ])
    const occupiedIntervals = this.toOccupiedIntervals([...existingBookings, ...existingAppointments])

    const available: string[] = []
    for (const slot of slots) {
      const [startH, startM] = slot.startTime.split(':').map(Number)
      const [endH, endM] = slot.endTime.split(':').map(Number)

      let current = setMinutes(setHours(date, startH), startM)
      const end = setMinutes(setHours(date, endH), endM)

      while (isBefore(addMinutes(current, sessionDuration), end)
          || +addMinutes(current, sessionDuration) === +end) {
        const timeStr = format(current, 'HH:mm')
        const offset = this.config.get<string>('APPOINTMENT_TIMEZONE_OFFSET') ?? '-03:00'
        const startsAt = new Date(`${dateStr}T${timeStr}:00${offset}`)
        if (!this.hasOverlap(this.timeToMinutes(timeStr), sessionDuration, occupiedIntervals) && isAfter(startsAt, now)) {
          available.push(timeStr)
        }
        current = addMinutes(current, stepMinutes)
      }
    }

    return available
  }

  async getAvailableDates(slugOrToken: string, monthStr: string, modality?: 'presencial' | 'online') {
    if (!/^\d{4}-\d{2}$/.test(monthStr)) {
      throw new BadRequestException('Mes invalido (use YYYY-MM)')
    }

    const start = parseISO(`${monthStr}-01`)
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
    const days = eachDayOfInterval({ start, end })
    let page: BookingPage | null = null
    if (/^[0-9a-f]{16}$/.test(slugOrToken)) {
      page = await this.resolveDailyToken(slugOrToken)
    }
    if (!page) {
      page = await this.pages.findOne({ where: { slug: slugOrToken, isActive: true } })
    }
    if (!page) throw new NotFoundException()
    if (modality === 'presencial' && !page.allowPresencial) return []
    if (modality === 'online' && !page.allowOnline) return []
    const sessionDuration = this.getSessionDuration(page, modality)
    const stepMinutes = this.getStepMinutes(page, modality)
    if (sessionDuration <= 0 || stepMinutes <= 0) return []

    const timeZone = this.config.get<string>('GOOGLE_CALENDAR_TIMEZONE') ?? 'America/Sao_Paulo'
    const now = new Date()
    const todayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now)
    const today = parseISO(todayStr)
    const minDate = addDays(today, page.minAdvanceDays ?? 0)
    const maxDate = getMaxAdvanceDate(today, page.maxAdvanceDays)

    const [slots, blockedDates, existingBookings, existingAppointments] = await Promise.all([
      this.availability.findAll(page.psychologistId),
      this.availability.getBlockedDates(page.psychologistId),
      this.bookings.find({
        where: {
          psychologistId: page.psychologistId,
          date: Between(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd')),
          status: In(OCCUPYING_BOOKING_STATUSES),
        },
        select: ['date', 'time', 'duration'],
      }),
      this.appointments.find({
        where: {
          psychologistId: page.psychologistId,
          date: Between(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd')),
          status: Not(In(FREE_APPOINTMENT_STATUSES)),
        },
        select: ['date', 'time', 'duration'],
      }),
    ])

    const activeSlots = slots.filter(slot => !modality || slot.modality === modality)
    const blocked = new Set(blockedDates.map(item => item.date))
    const occupiedByDate = new Map<string, Array<{ start: number; end: number }>>()
    for (const item of [...existingBookings, ...existingAppointments]) {
      const occupied = occupiedByDate.get(item.date) ?? []
      const startMinute = this.timeToMinutes(item.time)
      occupied.push({ start: startMinute, end: startMinute + Number(item.duration || 50) })
      occupiedByDate.set(item.date, occupied)
    }

    const available: string[] = []

    for (const day of days) {
      const dateStr = format(day, 'yyyy-MM-dd')
      if (isBefore(day, minDate) || isAfter(day, maxDate) || blocked.has(dateStr)) continue

      const daySlots = activeSlots.filter(slot => slot.weekday === getDay(day))
      if (!daySlots.length) continue

      const occupiedIntervals = occupiedByDate.get(dateStr) ?? []
      const hasAvailableTime = daySlots.some(slot => {
        const [startH, startM] = slot.startTime.slice(0, 5).split(':').map(Number)
        const [endH, endM] = slot.endTime.slice(0, 5).split(':').map(Number)
        let current = setMinutes(setHours(day, startH), startM)
        const dayEnd = setMinutes(setHours(day, endH), endM)

        while (isBefore(addMinutes(current, sessionDuration), dayEnd)
            || +addMinutes(current, sessionDuration) === +dayEnd) {
          const timeStr = format(current, 'HH:mm')
          const offset = this.config.get<string>('APPOINTMENT_TIMEZONE_OFFSET') ?? '-03:00'
          const startsAt = new Date(`${dateStr}T${timeStr}:00${offset}`)
          if (!this.hasOverlap(this.timeToMinutes(timeStr), sessionDuration, occupiedIntervals) && isAfter(startsAt, now)) return true
          current = addMinutes(current, stepMinutes)
        }
        return false
      })

      if (hasAvailableTime) available.push(dateStr)
    }

    return available
  }

  async createBooking(slugOrToken: string, dto: CreateBookingDto) {
    if (!dto.patientEmail && !dto.patientPhone) {
      throw new BadRequestException('Informe e-mail ou WhatsApp para contato')
    }

    let page: BookingPage | null = null
    if (/^[0-9a-f]{16}$/.test(slugOrToken)) {
      page = await this.resolveDailyToken(slugOrToken)
    }
    if (!page) {
      page = await this.pages.findOne({
        where: { slug: slugOrToken, isActive: true },
        relations: ['psychologist'],
      })
    }
    if (!page) throw new NotFoundException()
    if (dto.modality === 'presencial' && !page.allowPresencial) {
      throw new BadRequestException('Atendimento presencial indisponivel')
    }
    if (dto.modality === 'online' && !page.allowOnline) {
      throw new BadRequestException('Atendimento online indisponivel')
    }

    // Recarregar com relations se necessário
    if (!page.psychologist) {
      page = await this.pages.findOne({
        where: { id: page.id },
        relations: ['psychologist'],
      })
    }

    const confirmationToken = randomBytes(32).toString('hex')
    const cancellationCode = randomBytes(6).toString('base64url')
    const tokenExpiresAt = addDays(new Date(), 2)

    const saved = await this.dataSource.transaction(async (manager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
        ['appointment-day', `${page.psychologistId}:${dto.date}`],
      )

      const availableSlots = await this.getAvailableSlots(slugOrToken, dto.date, dto.modality)
      if (!availableSlots.includes(dto.time)) {
        throw new ConflictException('Este horario nao esta mais disponivel')
      }

      const booking = manager.create(Booking, {
        ...dto,
        modality: dto.modality ?? (page.allowOnline ? 'online' : 'presencial'),
        psychologistId: page.psychologistId,
        duration: this.getSessionDuration(page, dto.modality),
        amount: page.sessionPrice,
        confirmationToken,
        cancellationCode,
        tokenExpiresAt,
        status: 'confirmed',
        confirmedAt: new Date(),
        paymentStatus: 'pending',
      })

      return manager.save(Booking, booking)
    })

    const appointment = await this.createSessionResources(saved, page.psychologistId)
    if (appointment) this.googleCalendar.syncAppointment(appointment).catch(err => this.logCalendarError('sync', appointment.id, err))
    await this.maybeSendUpfrontCharge(saved, page, appointment)

    await this.notifications.sendBookingConfirmation(saved, page)
    await this.notifications.sendBookingCreatedToPsychologist(saved, page)

    return {
      id: saved.id,
      confirmationToken: saved.confirmationToken,
      message: 'Agendamento confirmado com sucesso!',
    }
  }

  async confirmByToken(token: string) {
    const booking = await this.bookings.findOne({
      where: { confirmationToken: token },
      relations: ['psychologist'],
    })
    if (!booking) throw new NotFoundException('Link de confirmacao invalido')
    if (new Date() > booking.tokenExpiresAt)
      throw new BadRequestException('Este link expirou. Solicite um novo agendamento.')
    if (booking.status === 'cancelled')
      throw new BadRequestException('Esta sessao foi cancelada')
    if (booking.status === 'confirmed')
      return {
        message: 'Sessao ja confirmada anteriormente.',
        booking: this.toCalendarBooking(booking),
      }

    await this.ensureScheduleIsFree(booking, booking.psychologistId)

    booking.status = 'confirmed'
    booking.confirmedAt = new Date()
    await this.bookings.save(booking)

    const appointment = await this.createSessionResources(booking, booking.psychologistId)
    if (appointment) this.googleCalendar.syncAppointment(appointment).catch(err => this.logCalendarError('sync', appointment.id, err))

    const page = await this.pages.findOne({
      where: { psychologistId: booking.psychologistId },
      relations: ['psychologist'],
    })
    await this.maybeSendUpfrontCharge(booking, page, appointment)
    await this.notifications.sendBookingConfirmation(booking, page)
    return {
      message: 'Sessao confirmada com sucesso!',
      booking: this.toCalendarBooking(booking),
    }
  }

  async cancelByToken(token: string, reason?: string) {
    const booking = await this.findByCancellationToken(token)
    if (booking.status === 'cancelled')
      return { message: 'Sessão já cancelada anteriormente.' }

    booking.status = 'cancelled'
    booking.cancelledAt = new Date()
    booking.cancellationReason = reason?.trim().slice(0, 500) || undefined
    await this.bookings.save(booking)
    await this.cancelLinkedAppointment(booking)
    await this.notifications.sendBookingCancellation(booking)

    return { message: 'Sessão cancelada. Esperamos te ver em breve.' }
  }

  async getCancellationPreview(token: string) {
    const booking = await this.findByCancellationToken(token)
    return {
      message: booking.status === 'cancelled'
        ? 'Esta sessão já foi cancelada anteriormente.'
        : 'Link de cancelamento válido. Confirme para cancelar a sessão.',
      booking: this.toCalendarBooking(booking),
    }
  }

  // ─── Psicólogo (autenticado) ────────────────────────────────────────────────

  async getMyBookings(psychologistId: string, status?: string) {
    const where: any = { psychologistId }
    if (status) where.status = status
    return this.bookings.find({
      where,
      order: { date: 'ASC', time: 'ASC' },
    })
  }

  async confirmBooking(id: string, psychologistId: string) {
    const booking = await this.findOne(id, psychologistId)

    await this.ensureScheduleIsFree(booking, psychologistId)

    booking.status    = 'confirmed'
    booking.confirmedAt = new Date()
    await this.bookings.save(booking)

    const appointment = await this.createSessionResources(booking, psychologistId)
    if (appointment) this.googleCalendar.syncAppointment(appointment).catch(err => this.logCalendarError('sync', appointment.id, err))

    const page = await this.pages.findOne({
      where: { psychologistId },
      relations: ['psychologist'],
    })
    await this.maybeSendUpfrontCharge(booking, page, appointment)
    await this.notifications.sendBookingConfirmation(booking, page)
    return booking
  }

  async rejectBooking(id: string, psychologistId: string, reason?: string) {
    const booking = await this.findOne(id, psychologistId)
    booking.status = 'cancelled'
    booking.cancelledAt = new Date()
    booking.cancellationReason = reason
    const saved = await this.bookings.save(booking)
    await this.cancelLinkedAppointment(saved)
    return saved
  }

  async markPaid(id: string, psychologistId: string, method: string) {
    const booking = await this.findOne(id, psychologistId)
    const today   = format(new Date(), 'yyyy-MM-dd')

    // Atualiza o Booking
    booking.paymentStatus = 'paid'
    booking.paymentMethod = method
    booking.paidAt        = new Date()
    await this.bookings.save(booking)

    // ── Atualiza ou cria o FinancialRecord ──────────────────────────────────
    let record: FinancialRecord | null = null
    record = await this.financial.findOne({
      where: [
        { bookingId: booking.id, psychologistId },
        ...(booking.appointmentId
          ? [
              { appointmentId: booking.appointmentId, psychologistId },
              { sessionId: booking.appointmentId, psychologistId },
            ]
          : []),
      ],
    })

    if (record) {
      // Marca o existente como pago
      record.status  = 'paid'
      record.paidAt  = today
      record.method  = method
      await this.financial.save(record)
    } else {
      // Booking antigo (anterior ao fix): cria diretamente como pago
      let patientName = 'Paciente'
      if (booking.appointmentId) {
        const appt = await this.appointments.findOne({
          where: { id: booking.appointmentId },
          relations: ['patient'],
        })
        patientName = appt?.patient?.name ?? booking.patientName ?? 'Paciente'
      }
      record = await this.financial.save(
        this.financial.create({
          type:          'income',
          amount:        Number(booking.amount) || 0,
          description:   `Sessão - ${patientName}`,
          status:        'paid',
          dueDate:       booking.date,
          paidAt:        today,
          method,
          psychologistId,
          appointmentId: booking.appointmentId ?? undefined,
          bookingId:     booking.id,
        }),
      )
    }

    if (booking.appointmentId) {
      await this.sessions.update(
        { appointmentId: booking.appointmentId, psychologistId },
        { paymentStatus: 'paid', paymentId: record?.id ?? undefined },
      )
    }

    return booking
  }

  // ─── Booking Page (configurações) ──────────────────────────────────────────

  async getMyPage(psychologistId: string) {
    let page = await this.pages.findOne({ where: { psychologistId } })
    const psychologist = await this.users.findOne({
      where: { id: psychologistId },
      select: ['id', 'name', 'crp'],
    })
    if (!psychologist) throw new NotFoundException()

    // Auto-cria a página na primeira visita para que o token diário funcione imediatamente
    if (!page) {
      const autoSlug = await this.buildUniqueSlug(psychologist.name, psychologist.crp)
      page = this.pages.create({
        psychologistId,
        slug: autoSlug,
        title: 'Agende sua sessão',
        sessionPrice: 150,
        sessionDuration: 50,
        presencialSessionDuration: 50,
        onlineSessionDuration: 50,
        slotInterval: 50,
        presencialSlotInterval: 10,
        onlineSlotInterval: 0,
        isActive: true,
      })
      page = await this.pages.save(page)
    } else if (!page.slug || /^psi-[0-9a-f]{12}$/i.test(page.slug)) {
      page.slug = await this.buildUniqueSlug(psychologist.name, psychologist.crp, page.id)
      page = await this.pages.save(page)
    }
    return page
  }

  async saveMyPage(psychologistId: string, dto: SaveBookingPageDto) {
    let page = await this.pages.findOne({ where: { psychologistId } })
    if (dto.maxAdvanceDays !== undefined && dto.minAdvanceDays !== undefined && dto.maxAdvanceDays < dto.minAdvanceDays) {
      throw new BadRequestException('A antecedencia maxima deve ser maior que a minima')
    }
    if (dto.slug !== undefined) {
      dto.slug = slugifyName(dto.slug)
      if (!dto.slug || dto.slug.length < 3) {
        throw new BadRequestException('Informe uma URL com pelo menos 3 caracteres')
      }
      const existing = await this.pages.findOne({ where: { slug: dto.slug } })
      if (existing && existing.psychologistId !== psychologistId) {
        throw new BadRequestException('Esta URL ja esta em uso')
      }
    }
    if (dto.avatarUrl !== undefined) {
      const avatarUrl = dto.avatarUrl.trim()
      if (avatarUrl) {
        try {
          new URL(avatarUrl)
        } catch {
          throw new BadRequestException('Informe uma URL valida para a foto')
        }
        dto.avatarUrl = avatarUrl
      } else {
        dto.avatarUrl = undefined
      }
    }
    if (page) {
      Object.assign(page, dto)
    } else {
      const psychologist = await this.users.findOne({
        where: { id: psychologistId },
        select: ['id', 'name', 'crp'],
      })
      if (!psychologist) throw new NotFoundException()
      const autoSlug = await this.buildUniqueSlug(psychologist.name, psychologist.crp)
      page = this.pages.create({ ...dto, psychologistId, slug: autoSlug })
    }
    return this.pages.save(page)
  }

  /**
   * Retorna o link diário do psicólogo + horário de expiração (meia-noite de Sao Paulo).
   */
  getDailyLink(psychologistId: string, baseUrl: string) {
    const token = this.generateDailyToken(psychologistId)
    const tomorrow = nextSaoPauloMidnight()
    const normalizedBaseUrl = baseUrl.replace(/\/+$/, '')

    return {
      token,
      url: `${normalizedBaseUrl}/agendar/${token}`,
      expiresAt: tomorrow.toISOString(),
    }
  }

  getStaticLink(slug: string, baseUrl: string) {
    const normalizedBaseUrl = baseUrl.replace(/\/+$/, '')
    return {
      slug,
      url: `${normalizedBaseUrl}/agendar/${slug}`,
    }
  }

  private async buildUniqueSlug(name: string, crp?: string | null, ignorePageId?: string): Promise<string> {
    const base = slugifyName(name)
    const crpSuffix = crp?.replace(/\D/g, '').slice(-6)
    const candidates = [
      base,
      crpSuffix ? `${base}-${crpSuffix}` : null,
    ].filter(Boolean) as string[]

    let counter = 2
    while (candidates.length < 20) {
      candidates.push(`${base}-${counter}`)
      counter++
    }

    for (const candidate of candidates) {
      const existing = await this.pages.findOne({ where: { slug: candidate } })
      if (!existing || existing.id === ignorePageId) return candidate
    }

    return `${base}-${randomBytes(3).toString('hex')}`
  }

  /**
   * Sincroniza retroativamente bookings confirmados sem Appointment/FinancialRecord.
   * Usa createSessionResources (idempotente) — seguro rodar múltiplas vezes.
   */
  async syncConfirmedBookings(psychologistId: string) {
    const confirmed = await this.bookings.find({
      where: { psychologistId, status: 'confirmed' as any },
    })

    let created = 0
    for (const booking of confirmed) {
      if (booking.appointmentId) continue   // já processado
      const appointment = await this.createSessionResources(booking, psychologistId)
      if (appointment) this.googleCalendar.syncAppointment(appointment).catch(err => this.logCalendarError('sync', appointment.id, err))
      created++
    }

    return { synced: created, total: confirmed.length }
  }

  /**
   * Cria (ou reaproveita) Patient + Appointment + FinancialRecord para um Booking confirmado.
   * Idempotente: se appointmentId já existir, não cria duplicata.
   * Usado tanto pelo fluxo do painel (confirmBooking) quanto pelo link público (confirmByToken).
   */
  private async createSessionResources(booking: Booking, psychologistId: string): Promise<Appointment | null> {
    // Idempotência: já foi processado
    if (booking.appointmentId) return null

    // ── 1. Encontra ou cria o Paciente ──────────────────────────────────────
    let patient: Patient | null = null
    if (booking.patientEmail) {
      patient = await this.patients.findOne({
        where: { email: booking.patientEmail, psychologistId },
      })
    }
    if (!patient && booking.patientPhone) {
      patient = await this.patients.findOne({
        where: { phone: booking.patientPhone, psychologistId },
      })
    }
    if (!patient) {
      patient = await this.patients.save(
        this.patients.create({
          name:            booking.patientName,
          email:           booking.patientEmail  || undefined,
          phone:           booking.patientPhone  || undefined,
          psychologistId,
          status:          'active',
          sessionPrice:    Number(booking.amount) || 0,
          sessionDuration: booking.duration || 50,
          startDate:       booking.date,
          tags:            [],
        }),
      )
    }

    // ── 2. Cria o Appointment interno ───────────────────────────────────────
    const appointment = await this.appointments.save(
      this.appointments.create({
        date:           booking.date,
        time:           booking.time,
        duration:       booking.duration,
        patientId:      patient.id,
        psychologistId,
        modality:       booking.modality ?? 'online',
        status:         'scheduled',
        notes:          booking.patientNotes || undefined,
      }),
    )
    appointment.patient = patient

    // ── 3. Vincula Appointment ao Booking ───────────────────────────────────
    booking.appointmentId = appointment.id
    await this.bookings.save(booking)

    // ── 4. Cria lançamento financeiro pendente ──────────────────────────────
    await this.financial.save(
      this.financial.create({
        type:          'income',
        amount:        Number(booking.amount) || 0,
        description:   `Sessão - ${patient.name}`,
        status:        'pending',
        dueDate:       booking.date,
        patientId:     patient.id,
        psychologistId,
        appointmentId: appointment.id,
        bookingId:     booking.id,
      }),
    )

    return appointment
  }

  private async maybeSendUpfrontCharge(
    booking: Booking,
    page: BookingPage | null,
    appointment: Appointment | null,
  ): Promise<void> {
    if (!appointment || !page?.requirePaymentUpfront) return

    const amount = Number(booking.amount) || 0
    if (amount <= 0) return

    try {
      const user = await this.users.findOneBy({ id: booking.psychologistId })
      const prefs = (user?.preferences ?? {}) as Record<string, any>
      if (prefs.autoCharge === false) return

      const pixKey = String(prefs.pixKey ?? page.pixKey ?? '').trim()
      if (!pixKey) return

      const patient = appointment.patient ?? await this.patients.findOne({
        where: { id: appointment.patientId, psychologistId: booking.psychologistId },
      })
      if (!patient) return

      const result = await this.notifications.sendPaymentRequest(
        patient,
        amount,
        pixKey,
        typeof prefs.chargeTemplate === 'string' ? prefs.chargeTemplate : undefined,
        Boolean(prefs.includeReceipt),
      )
      if (!result.sent) {
        this.logger.warn(`Cobranca antecipada nao enviada para booking ${booking.id}: ${result.error ?? 'erro desconhecido'}`)
      }
    } catch (err: any) {
      this.logger.warn(`Falha ao enviar cobranca antecipada para booking ${booking.id}: ${err?.message ?? 'erro desconhecido'}`)
    }
  }

  private getStepMinutes(page: BookingPage, modality?: 'presencial' | 'online'): number {
    const duration = this.getSessionDuration(page, modality)
    return duration + Math.max(0, this.getBreakInterval(page, modality))
  }

  private getBreakInterval(page: BookingPage, modality?: 'presencial' | 'online'): number {
    const duration = this.getSessionDuration(page, modality)
    const legacyStep = Number(page.slotInterval ?? duration)
    const legacyBreak = Math.max(legacyStep - duration, 0)

    if (modality === 'presencial') return Number(page.presencialSlotInterval ?? legacyBreak)
    if (modality === 'online') return Number(page.onlineSlotInterval ?? legacyBreak)
    return Number(page.onlineSlotInterval ?? page.presencialSlotInterval ?? legacyBreak)
  }

  private getSessionDuration(page: BookingPage, modality?: 'presencial' | 'online'): number {
    if (modality === 'presencial') return Number(page.presencialSessionDuration ?? page.sessionDuration ?? 50)
    if (modality === 'online') return Number(page.onlineSessionDuration ?? page.sessionDuration ?? 50)
    return Number(page.sessionDuration ?? page.onlineSessionDuration ?? page.presencialSessionDuration ?? 50)
  }

  private async findOne(id: string, psychologistId: string) {
    const b = await this.bookings.findOne({ where: { id, psychologistId } })
    if (!b) throw new NotFoundException()
    return b
  }

  private async findByCancellationToken(token: string): Promise<Booking> {
    const booking = await this.bookings.findOne({
      where: { cancellationCode: token },
      relations: ['psychologist'],
    })
    if (booking) return booking

    const legacyBooking = await this.bookings.findOne({
      where: { confirmationToken: token, cancellationCode: IsNull() },
      relations: ['psychologist'],
    })
    if (!legacyBooking) throw new NotFoundException('Link inválido')
    return legacyBooking
  }

  private normalizeTime(time: string) {
    return time.slice(0, 5)
  }

  private async cancelLinkedAppointment(booking: Booking): Promise<void> {
    if (!booking.appointmentId) return
    const appointment = await this.appointments.findOne({
      where: { id: booking.appointmentId },
      relations: ['patient'],
    })
    if (!appointment) return

    appointment.status = 'cancelled'
    await this.appointments.save(appointment)
    this.googleCalendar.deleteAppointment(appointment).catch(err => this.logCalendarError('delete', appointment.id, err))
  }

  private logCalendarError(action: 'sync' | 'delete', appointmentId: string, err: unknown): void {
    const message = err instanceof Error ? err.message : 'erro desconhecido'
    this.logger.warn(`google_calendar.${action}.failed appointmentId=${appointmentId} message=${message}`)
  }

  private toCalendarBooking(booking: Booking) {
    return {
      id: booking.id,
      patientName: booking.patientName,
      psychologistName: booking.psychologist?.name,
      psychologistCrp: booking.psychologist?.crp,
      date: booking.date,
      time: this.normalizeTime(booking.time),
      duration: booking.duration || 50,
      modality: booking.modality ?? 'online',
    }
  }

  private async ensureScheduleIsFree(booking: Booking, psychologistId: string) {
    const startMinute = this.timeToMinutes(booking.time)
    const endMinute = startMinute + Number(booking.duration || 50)
    const [bookingConflict, appointmentConflict] = await Promise.all([
      this.bookings
        .createQueryBuilder('b')
        .where('b.id <> :bookingId', { bookingId: booking.id })
        .andWhere('b.psychologistId = :psychologistId', { psychologistId })
        .andWhere('b.date = :date', { date: booking.date })
        .andWhere('b.status IN (:...statuses)', { statuses: OCCUPYING_BOOKING_STATUSES })
        .andWhere('(EXTRACT(EPOCH FROM b.time::time) / 60) < :endMinute', { endMinute })
        .andWhere('((EXTRACT(EPOCH FROM b.time::time) / 60) + COALESCE(b.duration, 50)) > :startMinute', { startMinute })
        .getOne(),
      this.appointments
        .createQueryBuilder('a')
        .where('a.psychologistId = :psychologistId', { psychologistId })
        .andWhere('a.date = :date', { date: booking.date })
        .andWhere('a.status NOT IN (:...ignoredStatuses)', { ignoredStatuses: FREE_APPOINTMENT_STATUSES })
        .andWhere('(EXTRACT(EPOCH FROM a.time::time) / 60) < :endMinute', { endMinute })
        .andWhere('((EXTRACT(EPOCH FROM a.time::time) / 60) + COALESCE(a.duration, 50)) > :startMinute', { startMinute })
        .getOne(),
    ])

    if (bookingConflict || appointmentConflict) {
      throw new ConflictException('Este horario nao esta mais disponivel')
    }
  }

  private toOccupiedIntervals(items: Array<{ time: string; duration?: number }>): Array<{ start: number; end: number }> {
    return items.map(item => {
      const start = this.timeToMinutes(item.time)
      return { start, end: start + Number(item.duration || 50) }
    })
  }

  private hasOverlap(startMinute: number, duration: number, occupied: Array<{ start: number; end: number }>): boolean {
    const endMinute = startMinute + Number(duration || 50)
    return occupied.some(item => item.start < endMinute && item.end > startMinute)
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.slice(0, 5).split(':').map(Number)
    return (hours * 60) + (minutes || 0)
  }
}
