import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Patient } from '../patients/entities/patient.entity'
import { CreateNutritionPlanDto, UpdateNutritionPlanDto } from './dto/nutrition-plan.dto'
import { NutritionPlan } from './entities/nutrition-plan.entity'

@Injectable()
export class NutritionPlansService {
  private readonly logger = new Logger(NutritionPlansService.name)

  constructor(
    @InjectRepository(NutritionPlan) private readonly plans: Repository<NutritionPlan>,
    @InjectRepository(Patient) private readonly patients: Repository<Patient>,
  ) {}

  async list(patientId: string, userId: string) {
    await this.assertPatient(patientId, userId)
    const records = await this.plans.find({
      where: { patientId, userId },
      order: { createdAt: 'DESC' },
    })
    return records.map(r => this.toDto(r))
  }

  async create(input: CreateNutritionPlanDto, userId: string) {
    await this.assertPatient(input.patientId, userId)
    const saved = await this.plans.save(
      this.plans.create({
        userId,
        patientId: input.patientId,
        title: input.title?.trim() || 'Plano Alimentar',
        content: input.content,
        totalCalories: input.totalCalories,
        validFrom: input.validFrom?.slice(0, 10),
        validUntil: input.validUntil?.slice(0, 10),
      }),
    )
    return this.toDto(saved)
  }

  async update(id: string, input: UpdateNutritionPlanDto, userId: string) {
    const plan = await this.plans.findOne({ where: { id, userId } })
    if (!plan) throw new NotFoundException('Plano alimentar não encontrado')

    if (input.title !== undefined) plan.title = input.title.trim() || 'Plano Alimentar'
    if (input.content !== undefined) plan.content = input.content
    if (input.totalCalories !== undefined) plan.totalCalories = input.totalCalories
    if (input.validFrom !== undefined) plan.validFrom = input.validFrom?.slice(0, 10)
    if (input.validUntil !== undefined) plan.validUntil = input.validUntil?.slice(0, 10)

    const saved = await this.plans.save(plan)
    return this.toDto(saved)
  }

  async remove(id: string, userId: string) {
    const result = await this.plans.delete({ id, userId })
    if (!result.affected) throw new NotFoundException('Plano alimentar não encontrado')
    return { ok: true as const }
  }

  private async assertPatient(patientId: string, userId: string) {
    const patient = await this.patients.findOne({ where: { id: patientId, psychologistId: userId } })
    if (!patient) throw new NotFoundException('Pessoa não encontrada')
  }

  private toDto(record: NutritionPlan) {
    return {
      id: record.id,
      patientId: record.patientId,
      userId: record.userId,
      title: record.title,
      content: record.content,
      totalCalories: record.totalCalories ?? null,
      validFrom: record.validFrom ?? null,
      validUntil: record.validUntil ?? null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }
  }
}
