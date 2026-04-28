import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Like } from 'typeorm'
import { randomBytes, createHmac } from 'crypto'
import { ConfigService } from '@nestjs/config'
import {
  addDays, format, parseISO, setHours, setMinutes,
  addMinutes, isBefore, isAfter, getDay,
} from 'date-fns'
import { Booking } from './entities/booking.entity'
import { BookingPage } from './entities/booking-page.entity'
import { AvailabilityService } from '../availability/availability.service'
import { NotificationsService } from '../notifications/notifications.service'
import { CreateBookingDto } from './dto/create-booking.dto'
import { SaveBookingPageDto } from './dto/save-booking-page.dto'

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)  private bookings: Repository<Booking>,
    @InjectRepository(BookingPage) private pages: Repository<BookingPage>,
    private availability: AvailabilityService,
    private notifications: NotificationsService,
    private config: ConfigService,
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
    if (token.length !== 16) return null
    const userPrefix = token.slice(0, 8)

    // Busca apenas páginas cujo psychologistId começa com o prefixo (UUID: xxxxxxxx-...)
    // Evita varrer a tabela inteira — O(1) na prática pois UUIDs são únicos por prefixo
    const candidates = await this.pages
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.psychologist', 'psychologist')
      .where('p.isActive = true')
      .andWhere("REPLACE(p.\"psychologistId\", '-', '') LIKE :prefix", { prefix: `${userPrefix}%` })
      .getMany()

    const secret = this.config.get<string>('SIGN_SECRET') ?? 'fallback-secret'
    const today = new Date().toISOString().split('T')[0]

    for (const page of candidates) {
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

  async getAvailableSlots(slugOrToken: string, dateStr: string) {
    let page: BookingPage | null = null
    if (/^[0-9a-f]{16}$/.test(slugOrToken)) {
      page = await this.resolveDailyToken(slugOrToken)
    }
    if (!page) {
      page = await this.pages.findOne({ where: { slug: slugOrToken, isActive: true } })
    }
    if (!page) throw new NotFoundException()

    const date = parseISO(dateStr)
    const weekday = getDay(date)

    const slots = await this.availability.getSlotsForDay(page.psychologistId, weekday)
    if (!slots.length) return []

    const isBlocked = await this.availability.isDateBlocked(page.psychologistId, dateStr)
    if (isBlocked) return []

    const minDate = addDays(new Date(), page.minAdvanceDays)
    const maxDate = addDays(new Date(), page.maxAdvanceDays)
    if (isBefore(date, minDate) || isAfter(date, maxDate)) return []

    const existing = await this.bookings.find({
      where: {
        psychologistId: page.psychologistId,
        date: dateStr,
        status: 'confirmed' as any,
      },
    })
    const occupiedTimes = new Set(existing.map(b => b.time))

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

    // Recarregar com relations se necessário
    if (!page.psychologist) {
      page = await this.pages.findOne({
        where: { id: page.id },
        relations: ['psychologist'],
      })
    }

    const conflict = await this.bookings.findOne({
      where: {
        psychologistId: page.psychologistId,
        date: dto.date,
        time: dto.time,
        status: 'confirmed' as any,
      },
    })
    if (conflict) throw new ConflictException('Este horário não está mais disponível')

    const confirmationToken = randomBytes(32).toString('hex')
    const tokenExpiresAt = addDays(new Date(), 2)

    const booking = this.bookings.create({
      ...dto,
      psychologistId: page.psychologistId,
      duration: page.sessionDuration,
      amount: page.sessionPrice,
      confirmationToken,
      tokenExpiresAt,
      status: 'pending',
      paymentStatus: 'pending',
    })

    const saved = await this.bookings.save(booking)
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

    booking.status = 'confirmed'
    booking.confirmedAt = new Date()
    await this.bookings.save(booking)
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
    booking.status = 'confirmed'
    booking.confirmedAt = new Date()
    const saved = await this.bookings.save(booking)
    await this.notifications.sendBookingConfirmation(saved)
    return saved
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
    booking.paymentStatus = 'paid'
    booking.paymentMethod = method
    booking.paidAt = new Date()
    return this.bookings.save(booking)
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

  private async findOne(id: string, psychologistId: string) {
    const b = await this.bookings.findOne({ where: { id, psychologistId } })
    if (!b) throw new NotFoundException()
    return b
  }
}
