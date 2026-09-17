import { NotFoundException } from '@nestjs/common'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Test } from '@nestjs/testing'
import { Patient } from '../patients/entities/patient.entity'
import { NutritionAssessment } from './entities/nutrition-assessment.entity'
import { NutritionAssessmentsService } from './nutrition-assessments.service'

const PROFESSIONAL_ID = '68f05b69-2ed5-4eca-9ec4-0f2b36cf8f76'
const PATIENT_ID = '46c2eb30-91cf-4f15-8ab0-1e192e04d845'
const RECORD_ID = '3b048fba-6a7e-4b2d-bfbb-353dfcc17f77'

function repo(overrides: Record<string, jest.Mock> = {}) {
  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((value: any) => value),
    save: jest.fn(async (value: any) => ({ id: RECORD_ID, createdAt: new Date(), updatedAt: new Date(), ...value })),
    delete: jest.fn().mockResolvedValue({ affected: 0 }),
    ...overrides,
  }
}

describe('NutritionAssessmentsService', () => {
  let service: NutritionAssessmentsService
  let assessments: ReturnType<typeof repo>
  let patients: ReturnType<typeof repo>

  beforeEach(async () => {
    assessments = repo()
    patients = repo()
    const module = await Test.createTestingModule({
      providers: [
        NutritionAssessmentsService,
        { provide: getRepositoryToken(NutritionAssessment), useValue: assessments },
        { provide: getRepositoryToken(Patient), useValue: patients },
      ],
    }).compile()
    service = module.get(NutritionAssessmentsService)
  })

  it('não lista medidas de pessoa que não pertence ao profissional', async () => {
    await expect(service.list(PATIENT_ID, PROFESSIONAL_ID)).rejects.toThrow(NotFoundException)
    expect(patients.findOne).toHaveBeenCalledWith({ where: { id: PATIENT_ID, psychologistId: PROFESSIONAL_ID } })
    expect(assessments.find).not.toHaveBeenCalled()
  })

  it('vincula a medida ao profissional autenticado e calcula o IMC', async () => {
    patients.findOne.mockResolvedValue({ id: PATIENT_ID, psychologistId: PROFESSIONAL_ID })
    const result = await service.create({ patientId: PATIENT_ID, assessedAt: '2026-09-15', weightKg: 68.5, heightCm: 165 }, PROFESSIONAL_ID)
    expect(assessments.create).toHaveBeenCalledWith(expect.objectContaining({
      patientId: PATIENT_ID, psychologistId: PROFESSIONAL_ID, weightKg: '68.5', heightCm: '165',
    }))
    expect(result.imc).toBe(25.2)
  })

  it('não exclui medida de outro profissional', async () => {
    await expect(service.remove(RECORD_ID, PROFESSIONAL_ID)).rejects.toThrow(NotFoundException)
    expect(assessments.delete).toHaveBeenCalledWith({ id: RECORD_ID, psychologistId: PROFESSIONAL_ID })
  })
})
