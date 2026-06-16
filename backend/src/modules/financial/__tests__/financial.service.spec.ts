import { BadRequestException, NotFoundException } from '@nestjs/common'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Test } from '@nestjs/testing'
import { FinancialRecord } from '../entities/financial-record.entity'
import { FinancialService } from '../financial.service'
import { NotificationsService } from '../../notifications/notifications.service'
import { Patient } from '../../patients/entities/patient.entity'
import { User } from '../../auth/entities/user.entity'
import { Session } from '../../sessions/entities/session.entity'

const PSY_ID = 'psy-1'

const makeRecord = (overrides: Partial<FinancialRecord> = {}): FinancialRecord => ({
  id: 'rec-1',
  type: 'income',
  amount: 200,
  description: 'Sessão',
  status: 'pending',
  dueDate: '2026-01-15',
  psychologistId: PSY_ID,
  createdAt: new Date(),
  ...overrides,
} as FinancialRecord)

function makeQb(results: any[], rawOne?: any) {
  const qb: any = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    createQueryBuilder: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(results),
    getRawOne: jest.fn().mockResolvedValue(rawOne ?? null),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
  }
  return qb
}

function makeRepo(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
    ...overrides,
  }
}

describe('FinancialService', () => {
  let service: FinancialService
  let repo: ReturnType<typeof makeRepo>
  let patientRepo: ReturnType<typeof makeRepo>

  beforeEach(async () => {
    repo = makeRepo()
    patientRepo = makeRepo()

    const module = await Test.createTestingModule({
      providers: [
        FinancialService,
        { provide: getRepositoryToken(FinancialRecord), useValue: repo },
        { provide: getRepositoryToken(Patient),         useValue: patientRepo },
        { provide: getRepositoryToken(User),            useValue: makeRepo() },
        { provide: getRepositoryToken(Session),         useValue: makeRepo() },
        { provide: NotificationsService, useValue: { sendPaymentRequest: jest.fn() } },
      ],
    }).compile()

    service = module.get(FinancialService)
  })

  describe('findAll', () => {
    it('retorna registros do psicólogo', async () => {
      const records = [makeRecord()]
      repo.find.mockResolvedValue(records)

      const result = await service.findAll(PSY_ID)

      expect(repo.find).toHaveBeenCalledWith(expect.objectContaining({
        where: { psychologistId: PSY_ID },
      }))
      expect(result).toHaveLength(1)
    })

    it('filtra por status quando fornecido', async () => {
      repo.find.mockResolvedValue([makeRecord({ status: 'paid' })])
      await service.findAll(PSY_ID, 'paid')
      expect(repo.find).toHaveBeenCalledWith(expect.objectContaining({
        where: { psychologistId: PSY_ID, status: 'paid' },
      }))
    })
  })

  describe('markPaid', () => {
    it('marca registro como pago e preenche paidAt', async () => {
      const record = makeRecord()
      repo.findOne.mockResolvedValue(record)
      repo.save.mockImplementation(async (r) => r)

      const result = await service.markPaid('rec-1', 'pix', PSY_ID)

      expect(result.status).toBe('paid')
      expect(result.method).toBe('pix')
      expect(result.paidAt).toBeTruthy()
    })

    it('lança NotFoundException quando registro não existe', async () => {
      repo.findOne.mockResolvedValue(null)
      await expect(service.markPaid('missing', 'pix', PSY_ID)).rejects.toThrow(NotFoundException)
    })
  })

  describe('getMonthlyReport', () => {
    it('lança BadRequestException para formato de mês inválido', async () => {
      await expect(service.getMonthlyReport(PSY_ID, 'invalido')).rejects.toThrow(BadRequestException)
    })

    it('retorna totais para mês válido', async () => {
      const records = [
        makeRecord({ type: 'income', status: 'paid', amount: 300 }),
        makeRecord({ id: 'rec-2', type: 'income', status: 'pending', amount: 100 }),
        makeRecord({ id: 'rec-3', type: 'expense', status: 'paid', amount: 50 }),
      ]
      const qb = makeQb(records)
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getMonthlyReport(PSY_ID, '2026-01')

      expect(result.month).toBe('2026-01')
      expect(result.totals.income).toBe(400)
      expect(result.totals.expense).toBe(50)
      expect(result.totals.paidIncome).toBe(300)
      expect(result.totals.pendingIncome).toBe(100)
      expect(result.totals.net).toBe(350)
    })
  })

  describe('getSummary', () => {
    it('retorna zeros quando não há registros', async () => {
      repo.find.mockResolvedValue([])
      const result = await service.getSummary(PSY_ID)
      expect(result.totalRevenue).toBe(0)
      expect(result.paid).toBe(0)
      expect(result.pending).toBe(0)
    })

    it('calcula totais corretamente', async () => {
      const records = [
        makeRecord({ type: 'income', status: 'paid', amount: 200 }),
        makeRecord({ id: 'rec-2', type: 'income', status: 'pending', amount: 100 }),
      ]
      repo.find.mockResolvedValue(records)
      const result = await service.getSummary(PSY_ID)
      expect(result.totalRevenue).toBe(300)
      expect(result.paid).toBe(200)
      expect(result.pending).toBe(100)
    })
  })
})
