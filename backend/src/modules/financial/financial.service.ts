import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { FinancialRecord } from './entities/financial-record.entity'
import { CreateFinancialDto } from './dto/create-financial.dto'

@Injectable()
export class FinancialService {
  constructor(@InjectRepository(FinancialRecord) private repo: Repository<FinancialRecord>) {}

  findAll(psychologistId: string, status?: string) {
    const where: any = { psychologistId }
    if (status) where.status = status
    return this.repo.find({ where, relations: ['patient'], order: { createdAt: 'DESC' } })
  }

  async findOne(id: string, psychologistId: string) {
    const r = await this.repo.findOne({ where: { id } })
    if (!r) throw new NotFoundException()
    if (r.psychologistId !== psychologistId) throw new ForbiddenException()
    return r
  }

  create(dto: CreateFinancialDto, psychologistId: string) {
    const record = this.repo.create({ ...dto, psychologistId })
    return this.repo.save(record)
  }

  async markPaid(id: string, method: string, psychologistId: string) {
    const r = await this.findOne(id, psychologistId)
    r.status = 'paid'
    r.paidAt = new Date().toISOString()
    r.method = method
    return this.repo.save(r)
  }

  async getSummary(psychologistId: string) {
    const records = await this.repo.find({ where: { psychologistId } })
    const income = records.filter(r => r.type === 'income')

    return {
      totalRevenue: income.reduce((s, r) => s + Number(r.amount), 0),
      paid: income.filter(r => r.status === 'paid').reduce((s, r) => s + Number(r.amount), 0),
      pending: income.filter(r => r.status === 'pending').reduce((s, r) => s + Number(r.amount), 0),
      overdue: income.filter(r => r.status === 'overdue').reduce((s, r) => s + Number(r.amount), 0),
    }
  }
}
