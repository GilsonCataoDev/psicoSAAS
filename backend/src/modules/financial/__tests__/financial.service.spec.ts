import { BadRequestException, NotFoundException } from '@nestjs/common'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Test } from '@nestjs/testing'
import { FinancialRecord } from '../entities/financial-record.entity'
import { FinancialService } from '../financial.service'
import { NotificationsService } from '../../notifications/notifications.service'
import { Patient } from '../../patients/entities/patient.entity'
import { User } from '../../auth/entities/user.entity'
import { Session } from '../../sessions/entities/session.entity'
import { Booking } from '../../booking/entities/booking.entity'
import { Appointment } from '../../appointments/entities/appointment.entity'

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
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
    ...overrides,
  }
}

describe('FinancialService', () => {
  let service: FinancialService
  let repo: ReturnType<typeof makeRepo>
  let patientRepo: ReturnType<typeof makeRepo>
  let sessionRepo: ReturnType<typeof makeRepo>
  let bookingRepo: ReturnType<typeof makeRepo>
  let notifications: { sendPaymentRequest: jest.Mock }

  beforeEach(async () => {
    repo = makeRepo()
    patientRepo = makeRepo()
    sessionRepo = makeRepo({ update: jest.fn().mockResolvedValue({ affected: 0 }) })
    bookingRepo = makeRepo({ update: jest.fn().mockResolvedValue({ affected: 0 }) })
    notifications = { sendPaymentRequest: jest.fn() }

    const module = await Test.createTestingModule({
      providers: [
        FinancialService,
        { provide: getRepositoryToken(FinancialRecord), useValue: repo },
        { provide: getRepositoryToken(Patient),         useValue: patientRepo },
        { provide: getRepositoryToken(User),            useValue: makeRepo() },
        { provide: getRepositoryToken(Session),         useValue: sessionRepo },
        { provide: getRepositoryToken(Booking),         useValue: bookingRepo },
        { provide: getRepositoryToken(Appointment),     useValue: makeRepo() },
        { provide: NotificationsService, useValue: notifications },
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

    it('sincroniza sessao e booking vinculados ao marcar como pago', async () => {
      const record = makeRecord({ sessionId: 'appt-1' })
      repo.findOne.mockResolvedValue(record)
      repo.save.mockImplementation(async (r) => r)

      await service.markPaid('rec-1', 'pix', PSY_ID)

      expect(sessionRepo.update).toHaveBeenCalledWith(
        { id: 'appt-1', psychologistId: PSY_ID },
        expect.objectContaining({ paymentStatus: 'paid', paymentId: 'rec-1' }),
      )
      expect(sessionRepo.update).toHaveBeenCalledWith(
        { appointmentId: 'appt-1', psychologistId: PSY_ID },
        expect.objectContaining({ paymentStatus: 'paid', paymentId: 'rec-1' }),
      )
      expect(bookingRepo.update).toHaveBeenCalledWith(
        { appointmentId: 'appt-1', psychologistId: PSY_ID },
        expect.objectContaining({ paymentStatus: 'paid', paymentMethod: 'pix' }),
      )
    })

    it('lança NotFoundException quando registro não existe', async () => {
      repo.findOne.mockResolvedValue(null)
      await expect(service.markPaid('missing', 'pix', PSY_ID)).rejects.toThrow(NotFoundException)
    })
  })

  describe('ensureMonthlyPackageCharge', () => {
    it('cria uma unica cobranca do pacote com o vencimento configurado', async () => {
      const patient = {
        id: 'pat-1',
        psychologistId: PSY_ID,
        status: 'active',
        billingType: 'monthly_package',
        monthlyPackagePrice: 600,
        monthlyIncludedSessions: 4,
        billingDay: 10,
      } as Patient
      repo.findOne.mockResolvedValue(null)
      repo.create.mockImplementation((value) => value)
      repo.save.mockImplementation(async (value) => ({ id: 'package-1', ...value }))

      const result = await service.ensureMonthlyPackageCharge(patient, new Date('2026-07-03T12:00:00'))

      expect(result?.amount).toBe(600)
      expect(result?.packageMonth).toBe('2026-07')
      expect(result?.dueDate).toBe('2026-07-10')
      expect(repo.save).toHaveBeenCalledTimes(1)
    })

    it('reutiliza a cobranca ja existente no mesmo mes', async () => {
      const existing = makeRecord({ packageMonth: '2026-07' })
      repo.findOne.mockResolvedValue(existing)
      const patient = {
        id: 'pat-1', psychologistId: PSY_ID, status: 'active', billingType: 'monthly_package',
        monthlyPackagePrice: 600, billingDay: 10,
      } as Patient

      const result = await service.ensureMonthlyPackageCharge(patient, new Date('2026-07-20T12:00:00'))

      expect(result).toBe(existing)
      expect(repo.save).not.toHaveBeenCalled()
    })
  })

  describe('sendChargeMessage', () => {
    it('falha com mensagem clara quando lancamento nao tem paciente', async () => {
      repo.findOne.mockResolvedValue(makeRecord({ patient: undefined }))

      await expect(service.sendChargeMessage('rec-1', PSY_ID)).rejects.toThrow(BadRequestException)
      expect(notifications.sendPaymentRequest).not.toHaveBeenCalled()
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
      const qb = makeQb([], null)
      repo.createQueryBuilder.mockReturnValue(qb)
      const result = await service.getSummary(PSY_ID)
      expect(result.totalRevenue).toBe(0)
      expect(result.paid).toBe(0)
      expect(result.pending).toBe(0)
    })

    it('calcula totais corretamente', async () => {
      const qb = makeQb([], {
        totalRevenue: '300',
        paid: '200',
        pending: '100',
        overdue: '0',
      })
      repo.createQueryBuilder.mockReturnValue(qb)
      const result = await service.getSummary(PSY_ID)
      expect(result.totalRevenue).toBe(300)
      expect(result.paid).toBe(200)
      expect(result.pending).toBe(100)
      expect(qb.where).toHaveBeenCalledWith(
        'record.psychologistId = :psychologistId',
        { psychologistId: PSY_ID },
      )
    })
  })
})
