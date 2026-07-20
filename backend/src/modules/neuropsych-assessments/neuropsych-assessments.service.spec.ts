import { BadRequestException, NotFoundException } from '@nestjs/common'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Test } from '@nestjs/testing'
import { Patient } from '../patients/entities/patient.entity'
import { InstrumentAssignment } from '../instrument-assignments/entities/instrument-assignment.entity'
import { NeuropsychAssessment } from './entities/neuropsych-assessment.entity'
import { NeuropsychBatteryItem } from './entities/neuropsych-battery-item.entity'
import { NeuropsychAssessmentsService } from './neuropsych-assessments.service'

const PSYCHOLOGIST_ID = '68f05b69-2ed5-4eca-9ec4-0f2b36cf8f76'
const PATIENT_ID = '46c2eb30-91cf-4f15-8ab0-1e192e04d845'
const ASSESSMENT_ID = '3b048fba-6a7e-4b2d-bfbb-353dfcc17f77'

function repo(overrides: Record<string, jest.Mock> = {}) {
  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    exist: jest.fn().mockResolvedValue(false),
    create: jest.fn((value: any) => value),
    save: jest.fn(async (value: any) => value),
    delete: jest.fn().mockResolvedValue({ affected: 0 }),
    ...overrides,
  }
}

function assessment(overrides: Partial<NeuropsychAssessment> = {}): NeuropsychAssessment {
  return {
    id: ASSESSMENT_ID,
    psychologistId: PSYCHOLOGIST_ID,
    patientId: PATIENT_ID,
    patient: { id: PATIENT_ID, name: 'Paciente A' } as Patient,
    status: 'planning',
    evaluatedDomains: [],
    startedAt: '2026-07-20',
    version: 1,
    batteryItems: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as NeuropsychAssessment
}

describe('NeuropsychAssessmentsService', () => {
  let service: NeuropsychAssessmentsService
  let assessments: ReturnType<typeof repo>
  let items: ReturnType<typeof repo>
  let patients: ReturnType<typeof repo>

  beforeEach(async () => {
    assessments = repo()
    items = repo()
    patients = repo()
    const module = await Test.createTestingModule({
      providers: [
        NeuropsychAssessmentsService,
        { provide: getRepositoryToken(NeuropsychAssessment), useValue: assessments },
        { provide: getRepositoryToken(NeuropsychBatteryItem), useValue: items },
        { provide: getRepositoryToken(Patient), useValue: patients },
        { provide: getRepositoryToken(InstrumentAssignment), useValue: repo() },
      ],
    }).compile()
    service = module.get(NeuropsychAssessmentsService)
  })

  it('filtra a leitura pelo id e pelo psicólogo proprietário', async () => {
    assessments.findOne.mockResolvedValue(null)
    await expect(service.findOne(ASSESSMENT_ID, PSYCHOLOGIST_ID)).rejects.toThrow(NotFoundException)
    expect(assessments.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: ASSESSMENT_ID, psychologistId: PSYCHOLOGIST_ID },
    }))
  })

  it('não devolve conteúdo clínico na listagem geral', async () => {
    assessments.find.mockResolvedValue([assessment({
      referralQuestion: 'ciphertext',
      batteryItems: [{
        id: 'item-1', assessmentId: ASSESSMENT_ID, patientId: PATIENT_ID,
        psychologistId: PSYCHOLOGIST_ID, name: 'Procedimento', procedureType: 'other',
        domains: [], status: 'planned', purpose: 'ciphertext', sortOrder: 0,
        createdAt: new Date(), updatedAt: new Date(),
      } as NeuropsychBatteryItem],
    })])
    const result = await service.list(PSYCHOLOGIST_ID)
    expect(assessments.find).toHaveBeenCalledWith(expect.objectContaining({ where: { psychologistId: PSYCHOLOGIST_ID } }))
    expect(result[0]).not.toHaveProperty('referralQuestion')
    expect(result[0]).not.toHaveProperty('batteryItems')
  })

  it('exige que o paciente pertença ao mesmo psicólogo ao criar', async () => {
    patients.findOne.mockResolvedValue(null)
    await expect(service.create({ patientId: PATIENT_ID }, PSYCHOLOGIST_ID)).rejects.toThrow(NotFoundException)
    expect(patients.findOne).toHaveBeenCalledWith({ where: { id: PATIENT_ID, psychologistId: PSYCHOLOGIST_ID } })
  })

  it('impede duas avaliações ativas para a mesma pessoa', async () => {
    patients.findOne.mockResolvedValue({ id: PATIENT_ID, psychologistId: PSYCHOLOGIST_ID })
    assessments.findOne.mockResolvedValue(assessment())
    await expect(service.create({ patientId: PATIENT_ID }, PSYCHOLOGIST_ID)).rejects.toThrow(BadRequestException)
    expect(assessments.save).not.toHaveBeenCalled()
  })

  it('filtra alteração de item por avaliação e psicólogo', async () => {
    items.findOne.mockResolvedValue(null)
    await expect(service.updateItem(ASSESSMENT_ID, 'item-1', { status: 'applied' }, PSYCHOLOGIST_ID))
      .rejects.toThrow(NotFoundException)
    expect(items.findOne).toHaveBeenCalledWith({
      where: { id: 'item-1', assessmentId: ASSESSMENT_ID, psychologistId: PSYCHOLOGIST_ID },
    })
  })

  it('filtra exclusão de item por avaliação e psicólogo', async () => {
    await expect(service.removeItem(ASSESSMENT_ID, 'item-1', PSYCHOLOGIST_ID)).rejects.toThrow(NotFoundException)
    expect(items.delete).toHaveBeenCalledWith({
      id: 'item-1', assessmentId: ASSESSMENT_ID, psychologistId: PSYCHOLOGIST_ID,
    })
  })
})
