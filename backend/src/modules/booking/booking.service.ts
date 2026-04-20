import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Between } from 'typeorm'
import { randomBytes } from 'crypto'
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
  ) {}

  // ─── Página pública ────────────────────────────────────────────────────────

  async getPublicPage(slug: string) {
    const page = await this.pages.findOne({
      where: { slug, isActive: true },
      relations: ['psychologist'],
    })
    if (!page) throw new NotFoundException('Página de agendamento não encontrada')

    const { psychologist, ...pageData } = page
    return {
      ...pageData,
      psychologistName: psychologist.name,
      psychologistCrp: psychologist.crp,
      specialty: psychologist.specialty,
    }
  }

  async getAvailableSlots(slug: string, dateStr: string) {
    const page = await this.pages.findOne({ where: { slug, isActive: true } })
    if (!page) throw new NotFoundException()

    const date = parseISO(dateStr)
    const weekday = getDay(date)

    // Verificar disponibilidade do dia
    const slots = await this.availability.getSlotsForDay(page.psychologistId, weekday)
    if (!slots.length) return []

    // Verificar bloqueios
    const isBlocked = await this.availability.isDateBlocked(page.psychologistId, dateStr)
    if (isBlocked) return []

    // Verificar antecedência mínima
    const minDate = addDays(new Date(), page.minAdvanceDays)
    const maxDate = addDays(new Date(), page.maxAdvanceDays)
    if (isBefore(date, minDate) || isAfter(date, maxDate)) return []

    // Buscar agendamentos existentes nesse dia
    const existing = await this.bookings.find({
      where: {
        psychologistId: page.psychologistId,
        date: dateStr,
        status: 'confirmed' as any,
      },
    })
    const occupiedTimes = new Set(existing.map(b => b.time))

    // Gerar slots disponíveis
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

  async createBooking(slug: string, dto: CreateBookingDto) {
    const page = await this.pages.findOne({
      where: { slug, isActive: true },
      relations: ['psychologist'],
    })
    if (!page) throw new NotFoundException()

    // Checar se horário ainda está livre
    const conflict = await this.bookings.findOne({
      where: {
        psychologistId: page.psychologistId,
        date: dto.date,
        time: dto.time,
        status: 'confirmed' as any,
      },
    })
    if (conflict) throw new ConflictException('Este horário não está mais disponível')

    const confirmationToken = randomBytes(24).toString('hex')

    const booking = this.bookings.create({
      ...dto,
      psychologistId: page.psychologistId,
      duration: page.sessionDuration,
      amount: page.sessionPrice,
      confirmationToken,
      status: 'pending',
      paymentStatus: 'pending',
    })

    const saved = await this.bookings.save(booking)

    // Notificar psicólogo e paciente
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
    if (booking.status === 'cancelled')
      throw new BadRequestException('Esta sessão foi cancelada')
    if (booking.status === 'confirmed')
      return { message: 'Sessão já confirmada anteriormente ✓', booking }

    booking.status = 'confirmed'
    booking.confirmedAt = new Date()
    await this.bookings.save(booking)

    await this.notifications.sendBookingConfirmation(booking)

    return { message: 'Sessão confirmada com sucesso! 🎉', booking }
  }

  async cancelByToken(token: string, reason?: string) {
    const booking = await this.bookings.findOne({ where: { confirmationToken: token } })
    if (!booking) throw new NotFoundException('Link inválido')
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
    return this.pages.findOne({ where: { psychologistId } })
  }

  async saveMyPage(psychologistId: string, dto: SaveBookingPageDto) {
    let page = await this.pages.findOne({ where: { psychologistId } })
    if (page) {
      Object.assign(page, dto)
    } else {
      page = this.pages.create({ ...dto, psychologistId })
    }
    return this.pages.save(page)
  }

  async generateSlug(name: string): Promise<string> {
    const base = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    const exists = await this.pages.findOne({ where: { slug: base } })
    return exists ? `${base}-${randomBytes(3).toString('hex')}` : base
  }

  private async findOne(id: string, psychologistId: string) {
    const b = await this.bookings.findOne({ where: { id, psychologistId } })
    if (!b) throw new NotFoundException()
    return b
  }
}
