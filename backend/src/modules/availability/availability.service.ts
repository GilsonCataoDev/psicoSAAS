import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AvailabilitySlot } from './entities/availability-slot.entity'
import { BlockedDate } from './entities/blocked-date.entity'
import { ExtraAvailabilitySlot } from './entities/extra-availability-slot.entity'
import { Appointment } from '../appointments/entities/appointment.entity'
import { Booking } from '../booking/entities/booking.entity'

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(AvailabilitySlot) private slots: Repository<AvailabilitySlot>,
    @InjectRepository(BlockedDate) private blocked: Repository<BlockedDate>,
    @InjectRepository(ExtraAvailabilitySlot) private extraSlots: Repository<ExtraAvailabilitySlot>,
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

  addBlockedDate(psychologistId: string, date: string, reason?: string) {
    const b = this.blocked.create({ psychologistId, date, reason })
    return this.blocked.save(b)
  }

  async removeBlockedDate(id: string, psychologistId: string) {
    await this.blocked.delete({ id, psychologistId })
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
