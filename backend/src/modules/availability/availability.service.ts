import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Between, In, Repository } from 'typeorm'
import { AvailabilitySlot } from './entities/availability-slot.entity'
import { BlockedDate } from './entities/blocked-date.entity'
import { ExtraAvailabilitySlot } from './entities/extra-availability-slot.entity'
import { AvailabilityBlock, AvailabilityBlockType } from './entities/availability-block.entity'
import { Appointment } from '../appointments/entities/appointment.entity'
import { Booking } from '../booking/entities/booking.entity'

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(AvailabilitySlot) private slots: Repository<AvailabilitySlot>,
    @InjectRepository(BlockedDate) private blocked: Repository<BlockedDate>,
    @InjectRepository(ExtraAvailabilitySlot) private extraSlots: Repository<ExtraAvailabilitySlot>,
    @InjectRepository(AvailabilityBlock) private blocks: Repository<AvailabilityBlock>,
    @InjectRepository(Appointment) private appointments: Repository<Appointment>,
    @InjectRepository(Booking) private bookings: Repository<Booking>,
  ) {}

  findAll(psychologistId: string) {
    return this.slots.find({
      where: { psychologistId, isActive: true },
      order: { modality: 'ASC', weekday: 'ASC', startTime: 'ASC' },
    })
  }

  getSlotsForDay(psychologistId: string, weekday: number, modality?: 'presencial' | 'online') {
    return this.slots.find({
      where: { psychologistId, weekday, isActive: true, ...(modality ? { modality } : {}) },
      order: { startTime: 'ASC' },
    })
  }

  getExtraSlots(psychologistId: string) {
    return this.extraSlots.find({
      where: { psychologistId, isActive: true },
      order: { date: 'ASC', startTime: 'ASC' },
    })
  }

  getExtraSlotsForDate(psychologistId: string, date: string, modality?: 'presencial' | 'online') {
    return this.extraSlots.find({
      where: { psychologistId, date, isActive: true, ...(modality ? { modality } : {}) },
      order: { startTime: 'ASC' },
    })
  }

  async addExtraSlot(
    psychologistId: string,
    data: { date: string; startTime: string; endTime: string; modality?: 'presencial' | 'online' },
  ) {
    this.validateDate(data.date)
    const modality = data.modality ?? 'online'
    this.validateSlots([{ weekday: 1, startTime: data.startTime, endTime: data.endTime, modality }])
    await this.ensureExtraSlotDoesNotConflict(psychologistId, {
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
    })
    const slot = this.extraSlots.create({
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      modality,
      psychologistId,
    })
    return this.extraSlots.save(slot)
  }

  async removeExtraSlot(id: string, psychologistId: string) {
    await this.extraSlots.delete({ id, psychologistId })
  }

  async isDateBlocked(psychologistId: string, date: string): Promise<boolean> {
    const b = await this.blocked.findOne({ where: { psychologistId, date } })
    return !!b
  }

  async saveSlots(psychologistId: string, slotsData: { weekday: number; startTime: string; endTime: string; modality?: 'presencial' | 'online' }[]) {
    this.validateSlots(slotsData)

    return this.slots.manager.transaction(async (manager) => {
      const slotRepo = manager.getRepository(AvailabilitySlot)
      await slotRepo.delete({ psychologistId })
      const newSlots = slotsData.map(s => slotRepo.create({ ...s, modality: s.modality ?? 'online', psychologistId }))
      return slotRepo.save(newSlots)
    })
  }

  getBlockedDates(psychologistId: string) {
    return this.blocked.find({ where: { psychologistId }, order: { date: 'ASC' } })
  }

  async addBlockedDate(psychologistId: string, date: string, reason?: string) {
    this.validateDate(date)
    const existing = await this.blocked.findOne({ where: { psychologistId, date } })
    if (existing) return existing

    const b = this.blocked.create({ psychologistId, date, reason: this.normalizeReason(reason) })
    return this.blocked.save(b)
  }

  async addBlockedWeek(psychologistId: string, selectedDate: string, reason?: string) {
    this.validateDate(selectedDate)
    const dates = this.getWeekDates(selectedDate)
    const existing = await this.blocked.find({
      where: { psychologistId, date: In(dates) },
      select: ['date'],
    })
    const existingDates = new Set(existing.map(item => item.date))
    const missingDates = dates.filter(date => !existingDates.has(date))

    if (missingDates.length) {
      const normalizedReason = this.normalizeReason(reason) ?? 'Semana bloqueada'
      await this.blocked.save(missingDates.map(date => this.blocked.create({
        psychologistId,
        date,
        reason: normalizedReason,
      })))
    }

    return { dates, created: missingDates.length }
  }

  async removeBlockedDate(id: string, psychologistId: string) {
    await this.blocked.delete({ id, psychologistId })
  }

  getAvailabilityBlocks(psychologistId: string) {
    return this.blocks.find({
      where: { psychologistId },
      order: { type: 'ASC', weekday: 'ASC', date: 'ASC', startTime: 'ASC' },
    })
  }

  getAvailabilityBlocksForDate(psychologistId: string, date: string, weekday: number) {
    return this.blocks.find({
      where: [
        { psychologistId, type: 'weekly', weekday },
        { psychologistId, type: 'date', date },
      ],
      order: { startTime: 'ASC' },
    })
  }

  getAvailabilityBlocksForPeriod(psychologistId: string, startDate: string, endDate: string) {
    return this.blocks.find({
      where: [
        { psychologistId, type: 'weekly' },
        { psychologistId, type: 'date', date: Between(startDate, endDate) },
      ],
      order: { type: 'ASC', weekday: 'ASC', date: 'ASC', startTime: 'ASC' },
    })
  }

  async addAvailabilityBlock(
    psychologistId: string,
    data: { type: AvailabilityBlockType; weekday?: number; date?: string; startTime: string; endTime: string; reason?: string },
  ) {
    this.validateAvailabilityBlock(data)
    const start = this.timeToMinutes(data.startTime)
    const end = this.timeToMinutes(data.endTime)
    const where = data.type === 'weekly'
      ? { psychologistId, type: data.type, weekday: data.weekday }
      : { psychologistId, type: data.type, date: data.date }
    const existing = await this.blocks.find({ where })
    const hasConflict = existing.some(block =>
      this.rangesOverlap(start, end, this.timeToMinutes(block.startTime), this.timeToMinutes(block.endTime)),
    )
    if (hasConflict) {
      throw new BadRequestException('Ja existe um bloqueio nesse periodo')
    }

    const block = this.blocks.create({
      psychologistId,
      type: data.type,
      weekday: data.type === 'weekly' ? data.weekday : null,
      date: data.type === 'date' ? data.date : null,
      startTime: data.startTime,
      endTime: data.endTime,
      reason: this.normalizeReason(data.reason),
    })
    return this.blocks.save(block)
  }

  async removeAvailabilityBlock(id: string, psychologistId: string) {
    await this.blocks.delete({ id, psychologistId })
  }

  private validateSlots(slotsData: { weekday: number; startTime: string; endTime: string; modality?: 'presencial' | 'online' }[]) {
    slotsData.forEach((slot) => {
      if (!Number.isInteger(slot.weekday) || slot.weekday < 0 || slot.weekday > 6) {
        throw new BadRequestException('Dia da semana invalido')
      }
      if (!['presencial', 'online', undefined].includes(slot.modality)) {
        throw new BadRequestException('Modalidade invalida')
      }

      const start = this.timeToMinutes(slot.startTime)
      const end = this.timeToMinutes(slot.endTime)
      if (start >= end) {
        throw new BadRequestException('O horario inicial deve ser menor que o horario final')
      }
    })
  }

  private validateDate(date: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('Data invalida')
    }
    const [year, month, day] = date.split('-').map(Number)
    const parsed = new Date(Date.UTC(year, month - 1, day))
    if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
      throw new BadRequestException('Data invalida')
    }
  }

  private validateAvailabilityBlock(data: { type: AvailabilityBlockType; weekday?: number; date?: string; startTime: string; endTime: string }) {
    if (!['weekly', 'date'].includes(data.type)) {
      throw new BadRequestException('Tipo de bloqueio invalido')
    }
    if (data.type === 'weekly') {
      if (!Number.isInteger(data.weekday) || data.weekday < 0 || data.weekday > 6) {
        throw new BadRequestException('Dia da semana invalido')
      }
    } else if (!data.date) {
      throw new BadRequestException('Data invalida')
    } else {
      this.validateDate(data.date)
    }

    const start = this.timeToMinutes(data.startTime)
    const end = this.timeToMinutes(data.endTime)
    if (start >= end) {
      throw new BadRequestException('O horario inicial deve ser menor que o horario final')
    }
  }

  private getWeekDates(selectedDate: string): string[] {
    const [year, month, day] = selectedDate.split('-').map(Number)
    const selected = new Date(Date.UTC(year, month - 1, day))
    const mondayOffset = (selected.getUTCDay() + 6) % 7
    const monday = new Date(selected)
    monday.setUTCDate(selected.getUTCDate() - mondayOffset)

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday)
      date.setUTCDate(monday.getUTCDate() + index)
      return date.toISOString().slice(0, 10)
    })
  }

  private normalizeReason(reason?: string): string | undefined {
    const normalized = reason?.trim().slice(0, 255)
    return normalized || undefined
  }

  private async ensureExtraSlotDoesNotConflict(
    psychologistId: string,
    data: { date: string; startTime: string; endTime: string },
  ): Promise<void> {
    const start = this.timeToMinutes(data.startTime)
    const end = this.timeToMinutes(data.endTime)
    const weekday = this.weekdayFromDate(data.date)

    const [weeklySlots, extraSlots, appointments, bookings] = await Promise.all([
      this.slots.find({ where: { psychologistId, weekday, isActive: true } }),
      this.extraSlots.find({ where: { psychologistId, date: data.date, isActive: true } }),
      this.appointments.find({ where: { psychologistId, date: data.date } }),
      this.bookings.find({ where: { psychologistId, date: data.date } }),
    ])

    const hasWeeklyConflict = weeklySlots.some(slot =>
      this.rangesOverlap(start, end, this.timeToMinutes(slot.startTime), this.timeToMinutes(slot.endTime)),
    )
    if (hasWeeklyConflict) {
      throw new BadRequestException('Este horario ja existe na agenda semanal')
    }

    const hasExtraConflict = extraSlots.some(slot =>
      this.rangesOverlap(start, end, this.timeToMinutes(slot.startTime), this.timeToMinutes(slot.endTime)),
    )
    if (hasExtraConflict) {
      throw new BadRequestException('Ja existe um horario extra nesse periodo')
    }

    const busyAppointments = appointments.filter(appt => !['cancelled', 'no_show'].includes(appt.status))
    const hasAppointmentConflict = busyAppointments.some(appt => {
      const apptStart = this.timeToMinutes(appt.time)
      return this.rangesOverlap(start, end, apptStart, apptStart + Number(appt.duration || 50))
    })
    if (hasAppointmentConflict) {
      throw new BadRequestException('Ja existe um atendimento marcado nesse horario')
    }

    const busyBookings = bookings.filter(booking => !['cancelled', 'no_show'].includes(booking.status))
    const hasBookingConflict = busyBookings.some(booking => {
      const bookingStart = this.timeToMinutes(booking.time)
      return this.rangesOverlap(start, end, bookingStart, bookingStart + Number(booking.duration || 50))
    })
    if (hasBookingConflict) {
      throw new BadRequestException('Ja existe uma solicitacao de agendamento nesse horario')
    }
  }

  private rangesOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
    return startA < endB && startB < endA
  }

  private weekdayFromDate(date: string): number {
    const [year, month, day] = date.split('-').map(Number)
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  }

  private timeToMinutes(time: string): number {
    const normalized = String(time ?? '').slice(0, 5)
    if (!/^\d{2}:\d{2}$/.test(normalized)) {
      throw new BadRequestException('Horario invalido')
    }
    const [hours, minutes] = normalized.split(':').map(Number)
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      throw new BadRequestException('Horario invalido')
    }
    return hours * 60 + minutes
  }
}
