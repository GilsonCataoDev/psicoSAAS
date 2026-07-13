import { NotFoundException } from '@nestjs/common'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Test } from '@nestjs/testing'
import { Session } from '../entities/session.entity'
import { SessionsService } from '../sessions.service'
import { FinancialService } from '../../financial/financial.service'
import { NotificationsService } from '../../notifications/notifications.service'
import { Patient } from '../../patients/entities/patient.entity'
import { User } from '../../auth/entities/user.entity'
import { Appointment } from '../../appointments/entities/appointment.entity'
import { Booking } from '../../booking/entities/booking.entity'

const PSY_ID = 'psy-1'
const PAT_ID = 'pat-1'

const makeSession = (overrides: Partial<Session> = {}): Session => ({
  id: 'sess-1',
  date: '2026-01-15',
  duration: 50,
  patientId: PAT_ID,
  psychologistId: PSY_ID,
  mood: 3,
  tags: [],
  paymentStatus: 'pending',
  summary: undefined,
  privateNotes: undefined,
  nextSteps: undefined,
  appointmentId: undefined,
  paymentId: undefined,
  patient: { id: PAT_ID, name: 'Joana' } as Patient,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
} as Session)

function makeQb(results: any[]) {
  const qb: any = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(results),
    getRawAndEntities: jest.fn().mockResolvedValue({
      entities: results,
      raw: results.map((session) => ({ s_has_summary: Boolean(session.summary) })),
    }),
  }
  return qb
}

function makeRepo(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
    update: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
    ...overrides,
  }
}

describe('SessionsService', () => {
  let service: SessionsService
  let sessionRepo: ReturnType<typeof makeRepo>
  let patientRepo: ReturnType<typeof makeRepo>
  let financial: {
    create: jest.Mock
    findBySessionId: jest.Mock
    findByAppointmentId: jest.Mock
    remove: jest.Mock
    updateLinkedRecord: jest.Mock
    markPaid: jest.Mock
    resetToPending: jest.Mock
    ensureMonthlyPackageCharge: jest.Mock
  }

  beforeEach(async () => {
    sessionRepo = makeRepo()
    patientRepo = makeRepo()
    financial = {
      create: jest.fn(),
      findBySessionId: jest.fn(),
      findByAppointmentId: jest.fn(),
      remove: jest.fn(),
      updateLinkedRecord: jest.fn(),
      markPaid: jest.fn(),
      resetToPending: jest.fn(),
      ensureMonthlyPackageCharge: jest.fn(),
    }

    const module = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: getRepositoryToken(Session),     useValue: sessionRepo },
        { provide: getRepositoryToken(Patient),     useValue: patientRepo },
        { provide: getRepositoryToken(User),        useValue: makeRepo() },
        { provide: getRepositoryToken(Appointment), useValue: makeRepo() },
        { provide: getRepositoryToken(Booking),     useValue: makeRepo() },
        { provide: FinancialService,       useValue: financial },
        { provide: NotificationsService,   useValue: { sendPaymentRequest: jest.fn() } },
      ],
    }).compile()

    service = module.get(SessionsService)
  })

  describe('findAll', () => {
    it('retorna listagem sem selecionar conteúdo clínico', async () => {
      const raw = makeSession()
      const qb = makeQb([raw])
      sessionRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.findAll(PSY_ID)

      expect(sessionRepo.createQueryBuilder).toHaveBeenCalledWith('s')
      expect(qb.where).toHaveBeenCalledWith('s.psychologistId = :psychologistId', { psychologistId: PSY_ID })
      expect(qb.select).toHaveBeenCalled()
      expect(qb.getRawAndEntities).toHaveBeenCalled()
      expect(qb.getMany).not.toHaveBeenCalled()
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('sess-1')
    })

    it('descriptografa conteúdo clínico apenas quando solicitado', async () => {
      const qb = makeQb([makeSession()])
      sessionRepo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll(PSY_ID, undefined, undefined, undefined, true)

      expect(qb.getMany).toHaveBeenCalled()
      expect(qb.getRawAndEntities).not.toHaveBeenCalled()
    })

    it('aplica filtro por patientId', async () => {
      const qb = makeQb([makeSession()])
      sessionRepo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll(PSY_ID, PAT_ID)

      expect(qb.andWhere).toHaveBeenCalledWith('s.patientId = :patientId', { patientId: PAT_ID })
    })

    it('aplica filtro por dateFrom e dateTo', async () => {
      const qb = makeQb([])
      sessionRepo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll(PSY_ID, undefined, '2026-01-01', '2026-01-31')

      expect(qb.andWhere).toHaveBeenCalledWith('s.date >= :dateFrom', { dateFrom: '2026-01-01' })
      expect(qb.andWhere).toHaveBeenCalledWith('s.date <= :dateTo', { dateTo: '2026-01-31' })
    })

    it('não aplica filtros opcionais quando ausentes', async () => {
      const qb = makeQb([])
      sessionRepo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll(PSY_ID)

      const andWhereCalls = qb.andWhere.mock.calls.map((c: any) => c[0])
      expect(andWhereCalls).not.toContain(expect.stringContaining('patientId'))
      expect(andWhereCalls).not.toContain(expect.stringContaining('dateFrom'))
    })
  })

  describe('findOne', () => {
    it('lança NotFoundException quando sessão não existe', async () => {
      sessionRepo.findOne.mockResolvedValue(null)
      await expect(service.findOne('missing', PSY_ID)).rejects.toThrow(NotFoundException)
    })

    it('busca sessão já filtrando pelo psicólogo dono', async () => {
      sessionRepo.findOne.mockResolvedValue(null)
      await expect(service.findOne('sess-1', PSY_ID)).rejects.toThrow(NotFoundException)
      expect(sessionRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'sess-1', psychologistId: PSY_ID },
        relations: ['patient'],
      })
    })

    it('retorna sessão quando encontrada e autorizada', async () => {
      sessionRepo.findOne.mockResolvedValue(makeSession())
      const result = await service.findOne('sess-1', PSY_ID)
      expect(result.id).toBe('sess-1')
    })
  })

  describe('create', () => {
    it('marca a sessao como incluida e gera apenas a mensalidade para paciente de pacote', async () => {
      const patient = {
        id: PAT_ID,
        name: 'Joana',
        psychologistId: PSY_ID,
        status: 'active',
        billingType: 'monthly_package',
        monthlyPackagePrice: 600,
        monthlyIncludedSessions: 4,
        billingDay: 5,
      } as Patient
      patientRepo.findOne.mockResolvedValue(patient)
      sessionRepo.create.mockImplementation((value) => ({ id: 'sess-1', ...value }))
      sessionRepo.save.mockImplementation(async (value) => value)

      const result = await service.create({
        patientId: PAT_ID,
        date: '2026-07-15',
        paymentStatus: 'pending',
      }, PSY_ID)

      expect(result.paymentStatus).toBe('included')
      expect(financial.ensureMonthlyPackageCharge).toHaveBeenCalledWith(patient, expect.any(Date))
      expect(financial.create).not.toHaveBeenCalled()
    })
  })
})
