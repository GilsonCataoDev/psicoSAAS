import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AvailabilitySlot } from './entities/availability-slot.entity'
import { BlockedDate } from './entities/blocked-date.entity'

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(AvailabilitySlot) private slots: Repository<AvailabilitySlot>,
    @InjectRepository(BlockedDate) private blocked: Repository<BlockedDate>,
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

  private timeToMinutes(time: string): number {
    if (!/^\d{2}:\d{2}$/.test(time)) {
      throw new BadRequestException('Horario invalido')
    }
    const [hours, minutes] = time.split(':').map(Number)
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      throw new BadRequestException('Horario invalido')
    }
    return hours * 60 + minutes
  }
}
