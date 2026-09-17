import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Patient } from '../patients/entities/patient.entity'
import { CreateNutritionAssessmentDto } from './dto/nutrition-assessment.dto'
import { NutritionAssessment } from './entities/nutrition-assessment.entity'

@Injectable()
export class NutritionAssessmentsService {
  constructor(
    @InjectRepository(NutritionAssessment) private readonly assessments: Repository<NutritionAssessment>,
    @InjectRepository(Patient) private readonly patients: Repository<Patient>,
  ) {}

  async list(patientId: string, psychologistId: string) {
    await this.assertPatient(patientId, psychologistId)
    const records = await this.assessments.find({
      where: { patientId, psychologistId },
      order: { assessedAt: 'ASC', createdAt: 'ASC' },
    })
    return records.map(record => this.toDto(record))
  }

  async create(input: CreateNutritionAssessmentDto, psychologistId: string) {
    await this.assertPatient(input.patientId, psychologistId)
    const saved = await this.assessments.save(this.assessments.create({
      psychologistId,
      patientId: input.patientId,
      assessedAt: input.assessedAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      weightKg: String(input.weightKg),
      heightCm: this.numberToString(input.heightCm),
      waistCm: this.numberToString(input.waistCm),
      bodyFatPercent: this.numberToString(input.bodyFatPercent),
      notes: input.notes?.trim() || undefined,
    }))
    return this.toDto(saved)
  }

  async remove(id: string, psychologistId: string) {
    const result = await this.assessments.delete({ id, psychologistId })
    if (!result.affected) throw new NotFoundException('Registro antropométrico não encontrado')
    return { ok: true as const }
  }

  private async assertPatient(patientId: string, psychologistId: string) {
    const patient = await this.patients.findOne({ where: { id: patientId, psychologistId } })
    if (!patient) throw new NotFoundException('Pessoa não encontrada')
  }

  private numberToString(value: number | undefined): string | undefined {
    return typeof value === 'number' ? String(value) : undefined
  }

  private toDto(record: NutritionAssessment) {
    const weightKg = Number(record.weightKg)
    const heightCm = record.heightCm ? Number(record.heightCm) : undefined
    const imc = heightCm ? Number((weightKg / ((heightCm / 100) ** 2)).toFixed(1)) : undefined
    return {
      id: record.id,
      patientId: record.patientId,
      assessedAt: record.assessedAt,
      weightKg,
      heightCm,
      waistCm: record.waistCm ? Number(record.waistCm) : undefined,
      bodyFatPercent: record.bodyFatPercent ? Number(record.bodyFatPercent) : undefined,
      notes: record.notes,
      imc,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }
  }
}
