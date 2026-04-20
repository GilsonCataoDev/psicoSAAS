import { Injectable } from '@nestjs/common'
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
    return this.slots.find({ where: { psychologistId, isActive: true }, order: { weekday: 'ASC', startTime: 'ASC' } })
  }

  getSlotsForDay(psychologistId: string, weekday: number) {
    return this.slots.find({ where: { psychologistId, weekday, isActive: true } })
  }

  async isDateBlocked(psychologistId: string, date: string): Promise<boolean> {
    const b = await this.blocked.findOne({ where: { psychologistId, date } })
    return !!b
  }

  async saveSlots(psychologistId: string, slotsData: { weekday: number; startTime: string; endTime: string }[]) {
    // Remove os existentes e recria
    await this.slots.delete({ psychologistId })
    const newSlots = slotsData.map(s => this.slots.create({ ...s, psychologistId }))
    return this.slots.save(newSlots)
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
}
