import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, In, Not, Repository } from 'typeorm'
import { randomBytes, createHmac } from 'crypto'
import { ConfigService } from '@nestjs/config'
import {
  addDays, format, parseISO, setHours, setMinutes,
  addMinutes, isBefore, isAfter, getDay, eachDayOfInterval,
} from 'date-fns'
import { Booking } from './entities/booking.entity'
import { BookingPage } from './entities/booking-page.entity'
import { Patient } from '../patients/entities/patient.entity'
import { Appointment } from '../appointments/entities/appointment.entity'
import { FinancialRecord } from '../financial/entities/financial-record.entity'
import { AvailabilityService } from '../availability/availability.service'
import { NotificationsService } from '../notifications/notifications.service'
import { CreateBookingDto } from './dto/create-booking.dto'
import { SaveBookingPageDto } from './dto/save-booking-page.dto'

const OCCUPYING_BOOKING_STATUSES: Booking['status'][] = ['pending', 'confirmed']
const FREE_APPOINTMENT_STATUSES = ['cancelled', 'no_show']

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)         private bookings:     Repository<Booking>,
    @InjectRepository(BookingPage)     private pages:        Repository<BookingPage>,
    @InjectRepository(Patient)         private patients:     Repository<Patient>,
    @InjectRepository(Appointment)     private appointments: Repository<Appointment>,
    @InjectRepository(FinancialRecord) private financial:    Repository<FinancialRecord>,
    private availability:  AvailabilityService,
    private notifications: NotificationsService,
    private config:        ConfigService,
    private dataSource:    DataSource,
  ) {}

  // ─── Daily token helpers ────────────────────────────────────────────────────

  /**
   * Gera o token diário de 16 chars para o link público.
   * Formato: {userId sem dashes, primeiros 8 chars}{HMAC(secret, userId:YYYY-MM-DD), primeiros 8 chars hex}
   * Rotaciona à meia-noite UTC.
   */
  generateDailyToken(userId: string): string {
    const secret = this.config.get<string>('SIGN_SECRET') ?? 'fallback-secret'
    const today = new Date().toISOString().split('T')[0]           // YYYY-MM-DD UTC
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
    const today = new Date().toISOString().split('T')[0]

    // Carrega apenas páginas ativas com relations — sem SQL raw
    const pages = await this.pages.find({
      where: { isActive: true },
      relations: ['psychologist'],
    })

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
      psychologistName: psychologist.name,
      psychologistCrp: psychologist.crp,
      specialty: psychologist.specialty,
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

    const date = parseISO(dateStr)
    const weekday = getDay(date)

    const slots = await this.availability.getSlotsForDay(page.psychologistId, weekday, modality)
    if (!slots.length) return []

    const isBlocked = await this.availability.isDateBlocked(page.psychologistId, dateStr)
    if (isBlocked) return []

    const minDate = addDays(new Date(), page.minAdvanceDays)
    const maxDate = addDays(new Date(), page.maxAdvanceDays)
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
    const occupiedTimes = new Set([
      ...existingBookings.map(b => this.normalizeTime(b.time)),
      ...existingAppointments.map(a => this.normalizeTime(a.time)),
    ])

    const available: string[] = []
    for (const slot of slots) {
      const [startH, startM] = slot.startTime.split(':').map(Number)
      const [endH, endM] = slot.endTime.split(':').map(Number)

      let current = setMinutes(setHours(date, startH), startM)
      const end = setMinutes(setHours(date, endH), endM)

      while (isBefore(addMinutes(current, page.sessionDuration), end)
          || +addMinutes(current, page.sessionDuration) === +end) {
        const timeStr = format(current, 'HH:mm')
        if (!occupiedTimes.has(timeStr)) {
          available.push(timeStr)
        }
        current = addMinutes(current, page.slotInterval)
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
    const available: string[] = []

    for (const day of days) {
      const dateStr = format(day, 'yyyy-MM-dd')
      const slots = await this.getAvailableSlots(slugOrToken, dateStr, modality)
      if (slots.length > 0) available.push(dateStr)
    }

    return available
  }

  async createBooking(slugOrToken: string, dto: CreateBookingDto) {
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
    const tokenExpiresAt = addDays(new Date(), 2)

    const saved = await this.dataSource.transaction(async (manager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
        ['appointment-slot', `${page.psychologistId}:${dto.date}:${dto.time}`],
      )

      const availableSlots = await this.getAvailableSlots(slugOrToken, dto.date, dto.modality)
      if (!availableSlots.includes(dto.time)) {
        throw new ConflictException('Este horario nao esta mais disponivel')
      }

      const booking = manager.create(Booking, {
        ...dto,
        modality: dto.modality ?? (page.allowOnline ? 'online' : 'presencial'),
        psychologistId: page.psychologistId,
        duration: page.sessionDuration,
        amount: page.sessionPrice,
        confirmationToken,
        tokenExpiresAt,
        status: 'pending',
        paymentStatus: 'pending',
      })

      return manager.save(Booking, booking)
    })

    await this.notifications.sendBookingRequest(saved, page)

    return {
      id: saved.id,
      confirmationToken: saved.confirmationToken,
      message: 'Solicitação recebida! Aguarde a confirmação do psicólogo.',
    }
  }

  async confirmByToken(token: string) {
    const booking = await this.bookings.findOne({
      where: { confirmationToken: token },
      relations: ['psychologist'],
    })
    if (!booking) throw new NotFoundException('Link de confirmação inválido')
    if (new Date() > booking.tokenExpiresAt)
      throw new BadRequestException('Este link expirou. Solicite um novo agendamento.')
    if (booking.status === 'cancelled')
      throw new BadRequestException('Esta sessão foi cancelada')
    if (booking.status === 'confirmed')
      return { message: 'Sessão já confirmada anteriormente ✓' }

    await this.ensureScheduleIsFree(booking, booking.psychologistId)

    booking.status    = 'confirmed'
    booking.confirmedAt = new Date()
    await this.bookings.save(booking)

    // Cria Patient + Appointment + FinancialRecord (mesmo fluxo do painel)
    await this.createSessionResources(booking, booking.psychologistId)

    await this.notifications.sendBookingConfirmation(booking)
    return { message: 'Sessão confirmada com sucesso! 🎉' }
  }

  async cancelByToken(token: string, reason?: string) {
    const booking = await this.bookings.findOne({ where: { confirmationToken: token } })
    if (!booking) throw new NotFoundException('Link inválido')
    if (new Date() > booking.tokenExpiresAt)
      throw new BadRequestException('Este link expirou.')
    if (booking.status === 'cancelled')
      return { message: 'Sessão já cancelada anteriormente.' }

    booking.status = 'cancelled'
    booking.cancelledAt = new Date()
    booking.cancellationReason = reason
    await this.bookings.save(booking)

    return { message: 'Sessão cancelada. Esperamos te ver em breve 🌿' }
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

    await this.createSessionResources(booking, psychologistId)

    await this.notifications.sendBookingConfirmation(booking)
    return booking
  }

  async rejectBooking(id: string, psychologistId: string, reason?: string) {
    const booking = await this.findOne(id, psychologistId)
    booking.status = 'cancelled'
    booking.cancelledAt = new Date()
    booking.cancellationReason = reason
    return this.bookings.save(booking)
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
    // Tenta achar pelo appointmentId (salvo em sessionId no confirm)
    let record: FinancialRecord | null = null
    if (booking.appointmentId) {
      record = await this.financial.findOne({
        where: { sessionId: booking.appointmentId, psychologistId },
      })
    }

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
      await this.financial.save(
        this.financial.create({
          type:          'income',
          amount:        Number(booking.amount) || 0,
          description:   `Sessão - ${patientName}`,
          status:        'paid',
          dueDate:       booking.date,
          paidAt:        today,
          method,
          psychologistId,
          sessionId:     booking.appointmentId ?? undefined,
        }),
      )
    }

    return booking
  }

  // ─── Booking Page (configurações) ──────────────────────────────────────────

  async getMyPage(psychologistId: string) {
    let page = await this.pages.findOne({ where: { psychologistId } })
    // Auto-cria a página na primeira visita para que o token diário funcione imediatamente
    if (!page) {
      const autoSlug = `psi-${psychologistId.replace(/-/g, '').slice(0, 12)}`
      page = this.pages.create({
        psychologistId,
        slug: autoSlug,
        title: 'Agende sua sessão',
        sessionPrice: 150,
        sessionDuration: 50,
        slotInterval: 60,
        isActive: true,
      })
      page = await this.pages.save(page)
    }
    return page
  }

  async saveMyPage(psychologistId: string, dto: SaveBookingPageDto) {
    let page = await this.pages.findOne({ where: { psychologistId } })
    if (page) {
      Object.assign(page, dto)
    } else {
      // Auto-gera slug interno baseado no userId (único e imutável)
      const autoSlug = `psi-${psychologistId.replace(/-/g, '').slice(0, 12)}`
      page = this.pages.create({ ...dto, psychologistId, slug: autoSlug })
    }
    return this.pages.save(page)
  }

  /**
   * Retorna o link diário do psicólogo + horário de expiração (meia-noite UTC).
   */
  getDailyLink(psychologistId: string, baseUrl: string) {
    const token = this.generateDailyToken(psychologistId)
    const now = new Date()
    const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))

    return {
      token,
      url: `${baseUrl}/agendar/${token}`,
      expiresAt: tomorrow.toISOString(),
    }
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
      await this.createSessionResources(booking, psychologistId)
      created++
    }

    return { synced: created, total: confirmed.length }
  }

  /**
   * Cria (ou reaproveita) Patient + Appointment + FinancialRecord para um Booking confirmado.
   * Idempotente: se appointmentId já existir, não cria duplicata.
   * Usado tanto pelo fluxo do painel (confirmBooking) quanto pelo link público (confirmByToken).
   */
  private async createSessionResources(booking: Booking, psychologistId: string): Promise<void> {
    // Idempotência: já foi processado
    if (booking.appointmentId) return

    // ── 1. Encontra ou cria o Paciente ──────────────────────────────────────
    let patient: Patient | null = null
    if (booking.patientEmail) {
      patient = await this.patients.findOne({
        where: { email: booking.patientEmail, psychologistId },
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
        sessionId:     appointment.id,   // referência para markPaid encontrar o registro
      }),
    ).catch(() => {})  // não derruba o fluxo se a coluna ainda não existir em prod
  }

  private async findOne(id: string, psychologistId: string) {
    const b = await this.bookings.findOne({ where: { id, psychologistId } })
    if (!b) throw new NotFoundException()
    return b
  }

  private normalizeTime(time: string) {
    return time.slice(0, 5)
  }

  private async ensureScheduleIsFree(booking: Booking, psychologistId: string) {
    const [bookingConflict, appointmentConflict] = await Promise.all([
      this.bookings.findOne({
        where: {
          id: Not(booking.id),
          psychologistId,
          date: booking.date,
          time: booking.time,
          status: 'confirmed',
        },
      }),
      this.appointments.findOne({
        where: {
          psychologistId,
          date: booking.date,
          time: booking.time,
          status: Not(In(FREE_APPOINTMENT_STATUSES)),
        },
      }),
    ])

    if (bookingConflict || appointmentConflict) {
      throw new ConflictException('Este horario nao esta mais disponivel')
    }
  }
}
