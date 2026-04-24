import { Injectable, NotFoundException, ForbiddenException, PaymentRequiredException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Patient } from './entities/patient.entity'
import { CreatePatientDto } from './dto/create-patient.dto'
import { UpdatePatientDto } from './dto/update-patient.dto'
import { Subscription } from '../subscriptions/entities/subscription.entity'
import { PLAN_LIMITS } from '../../common/guards/plan.guard'

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient) private repo: Repository<Patient>,
    @InjectRepository(Subscription) private subs: Repository<Subscription>,
  ) {}

  private async checkPatientLimit(userId: string) {
    const sub = await this.subs.findOne({ where: { userId } })
    const plan = (sub?.status === 'active' || sub?.status === 'trialing')
      ? (sub.planId as keyof typeof PLAN_LIMITS)
      : 'free'

    const limit = PLAN_LIMITS[plan]?.maxPatients ?? 2
    if (limit === -1) return   // ilimitado (pro)

    const count = await this.repo.count({ where: { psychologistId: userId, status: 'active' } })
    if (count >= limit) {
      throw new ForbiddenException({
        message: `Limite de ${limit} pessoa${limit !== 1 ? 's' : ''} atingido para o plano ${plan}. Faça upgrade para adicionar mais.`,
        upgradeUrl: '/planos',
        currentPlan: plan,
      })
    }
  }

  findAll(psychologistId: string) {
    return this.repo.find({
      where: { psychologistId },
      order: { name: 'ASC' },
    })
  }

  async findOne(id: string, psychologistId: string) {
    const patient = await this.repo.findOne({ where: { id }, relations: ['sessions', 'appointments'] })
    if (!patient) throw new NotFoundException('Pessoa não encontrada')
    if (patient.psychologistId !== psychologistId) throw new ForbiddenException()
    return patient
  }

  async create(dto: CreatePatientDto, psychologistId: string) {
    await this.checkPatientLimit(psychologistId)
    const patient = this.repo.create({ ...dto, psychologistId })
    return this.repo.save(patient)
  }

  async update(id: string, dto: UpdatePatientDto, psychologistId: string) {
    const patient = await this.findOne(id, psychologistId)
    Object.assign(patient, dto)
    return this.repo.save(patient)
  }

  async remove(id: string, psychologistId: string) {
    const patient = await this.findOne(id, psychologistId)
    return this.repo.softRemove(patient)
  }
}
