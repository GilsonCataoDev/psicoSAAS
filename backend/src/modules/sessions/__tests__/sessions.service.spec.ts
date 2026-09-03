import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { encrypt } from '../../../common/crypto/encrypt.util'
import { Session } from '../entities/session.entity'
import { SessionRevision } from '../entities/session-revision.entity'
import { NoteSnippet } from '../entities/note-snippet.entity'
import { SessionsService } from '../sessions.service'
import { FinancialService } from '../../financial/financial.service'
import { NotificationsService } from '../../notifications/notifications.service'
import { ClinicalAiDraftService } from '../../ai-governance/clinical-ai-draft.service'
import { Patient } from '../../patients/entities/patient.entity'
import { User } from '../../auth/entities/user.entity'
import { Appointment } from '../../appointments/entities/appointment.entity'
import { Booking } from '../../booking/entities/booking.entity'

process.env.ENCRYPTION_KEY = 'sessions-service-test-key-with-32-chars!'

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
  let revisionRepo: ReturnType<typeof makeRepo>
  let snippetRepo: ReturnType<typeof makeRepo>
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
    revisionRepo = makeRepo()
    snippetRepo = makeRepo()
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
        { provide: getRepositoryToken(Session),         useValue: sessionRepo },
        { provide: getRepositoryToken(SessionRevision), useValue: revisionRepo },
        { provide: getRepositoryToken(NoteSnippet),     useValue: snippetRepo },
        { provide: getRepositoryToken(Patient),     useValue: patientRepo },
        { provide: getRepositoryToken(User),        useValue: makeRepo() },
        { provide: getRepositoryToken(Appointment), useValue: makeRepo() },
        { provide: getRepositoryToken(Booking),     useValue: makeRepo() },
        { provide: FinancialService,       useValue: financial },
        { provide: NotificationsService,   useValue: { sendPaymentRequest: jest.fn() } },
        { provide: ClinicalAiDraftService, useValue: { assertCanAccept: jest.fn(), acceptForSession: jest.fn() } },
        { provide: ConfigService, useValue: { getOrThrow: jest.fn().mockReturnValue('sign-secret-de-teste-com-32-chars!') } },
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

    it('importa sessao historica sem gerar cobranca mesmo para paciente de pacote', async () => {
      const patient = {
        id: PAT_ID,
        name: 'Joana',
        psychologistId: PSY_ID,
        status: 'active',
        billingType: 'monthly_package',
        monthlyPackagePrice: 600,
      } as Patient
      patientRepo.findOne.mockResolvedValue(patient)
      sessionRepo.create.mockImplementation((value) => ({ id: 'sess-historica', ...value }))
      sessionRepo.save.mockImplementation(async (value) => value)

      const result = await service.createHistorical({
        patientId: PAT_ID,
        date: '2025-07-15',
        summary: 'Registro migrado e revisado.',
      }, PSY_ID)

      expect(result.paymentStatus).toBe('waived')
      expect(financial.ensureMonthlyPackageCharge).not.toHaveBeenCalled()
      expect(financial.create).not.toHaveBeenCalled()
    })

    it('rejeita data futura na importacao historica', async () => {
      await expect(service.createHistorical({
        patientId: PAT_ID,
        date: '2999-01-01',
        summary: 'Registro revisado.',
      }, PSY_ID)).rejects.toThrow('não pode estar no futuro')
      expect(sessionRepo.save).not.toHaveBeenCalled()
    })
  })

  describe('update — trava de edição e trilha de auditoria', () => {
    it('bloqueia edição direta do conteúdo clínico em sessão com mais de 7 dias', async () => {
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 10)
      sessionRepo.findOne.mockResolvedValue(makeSession({ date: oldDate.toISOString().slice(0, 10) }))

      await expect(service.update('sess-1', { summary: 'Texto novo' }, PSY_ID)).rejects.toThrow(ForbiddenException)
      expect(sessionRepo.save).not.toHaveBeenCalled()
      expect(revisionRepo.save).not.toHaveBeenCalled()
    })

    it('permite editar campos não-clínicos (ex.: paymentStatus) mesmo em sessão antiga', async () => {
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 30)
      sessionRepo.findOne.mockResolvedValue(makeSession({ date: oldDate.toISOString().slice(0, 10) }))
      sessionRepo.save.mockImplementation(async (v) => v)

      await service.update('sess-1', { paymentStatus: 'paid' }, PSY_ID)

      expect(sessionRepo.save).toHaveBeenCalled()
      expect(revisionRepo.save).not.toHaveBeenCalled()
    })

    it('grava snapshot da versão anterior e recalcula o hash de integridade ao editar dentro do prazo', async () => {
      const session = makeSession({
        date: new Date().toISOString().slice(0, 10),
        summary: encrypt('Resumo antigo'),
      })
      sessionRepo.findOne.mockResolvedValue(session) // mesma referência: reflete a mutação feita pelo update()
      sessionRepo.save.mockImplementation(async (v) => v)
      revisionRepo.create.mockImplementation((v) => v)

      await service.update('sess-1', { summary: 'Resumo novo' }, PSY_ID)

      expect(revisionRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        sessionId: 'sess-1',
        psychologistId: PSY_ID,
        summary: expect.any(String), // snapshot criptografado do valor ANTERIOR
      }))
      expect(revisionRepo.save).toHaveBeenCalled()
      expect(sessionRepo.update).toHaveBeenCalledWith(
        { id: 'sess-1', psychologistId: PSY_ID },
        expect.objectContaining({ contentHash: expect.any(String), lastEditedAt: expect.any(Date) }),
      )
    })
  })

  describe('addAddendum', () => {
    it('rejeita texto vazio', async () => {
      await expect(service.addAddendum('sess-1', PSY_ID, '   ')).rejects.toThrow(BadRequestException)
    })

    it('acrescenta complemento sem exigir edição do texto original', async () => {
      sessionRepo.findOne.mockResolvedValue(makeSession({ addenda: undefined }))
      sessionRepo.save.mockImplementation(async (v) => v)

      const result = await service.addAddendum('sess-1', PSY_ID, 'Paciente confirmou o combinado por WhatsApp.')

      expect(result.addendaList).toHaveLength(1)
      expect(result.addendaList[0].text).toBe('Paciente confirmou o combinado por WhatsApp.')
    })

    it('acumula múltiplos complementos preservando os anteriores', async () => {
      const existingAddenda = encrypt(JSON.stringify([{ text: 'Primeiro complemento', createdAt: '2026-01-01T00:00:00.000Z' }]))
      sessionRepo.findOne.mockResolvedValue(makeSession({ addenda: existingAddenda }))
      sessionRepo.save.mockImplementation(async (v) => v)

      const result = await service.addAddendum('sess-1', PSY_ID, 'Segundo complemento')

      expect(result.addendaList).toHaveLength(2)
      expect(result.addendaList[0].text).toBe('Primeiro complemento')
      expect(result.addendaList[1].text).toBe('Segundo complemento')
    })
  })

  describe('getHistory', () => {
    it('retorna revisões decifradas ordenadas por data decrescente', async () => {
      sessionRepo.findOne.mockResolvedValue(makeSession())
      revisionRepo.find.mockResolvedValue([
        { id: 'rev-1', summary: encrypt('Versão anterior'), privateNotes: undefined, nextSteps: undefined, editedAt: new Date('2026-01-01') },
      ])

      const history = await service.getHistory('sess-1', PSY_ID)

      expect(revisionRepo.find).toHaveBeenCalledWith({
        where: { sessionId: 'sess-1', psychologistId: PSY_ID },
        order: { editedAt: 'DESC' },
      })
      expect(history[0].summary).toBe('Versão anterior')
    })

    it('lança NotFoundException se a sessão não pertence ao psicólogo', async () => {
      sessionRepo.findOne.mockResolvedValue(null)
      await expect(service.getHistory('sess-1', PSY_ID)).rejects.toThrow(NotFoundException)
    })
  })

  describe('snippets (atalhos de texto)', () => {
    it('cria um modelo com conteúdo criptografado e devolve o texto original', async () => {
      snippetRepo.create.mockImplementation((v) => v)
      snippetRepo.save.mockImplementation(async (v) => ({ id: 'snip-1', createdAt: new Date(), ...v }))

      const created = await service.createSnippet(PSY_ID, 'Sem risco', 'Sem risco de auto/heteroagressão observado.')

      expect(created.label).toBe('Sem risco')
      expect(created.content).toBe('Sem risco de auto/heteroagressão observado.')
      expect(snippetRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        psychologistId: PSY_ID,
        label: 'Sem risco',
        content: expect.not.stringMatching('Sem risco de auto/heteroagressão observado.'),
      }))
    })

    it('rejeita label vazio', async () => {
      await expect(service.createSnippet(PSY_ID, '   ', 'conteúdo válido')).rejects.toThrow(BadRequestException)
    })

    it('deleteSnippet lança NotFoundException se o modelo não existe ou não pertence ao psicólogo', async () => {
      snippetRepo.findOne.mockResolvedValue(null)
      await expect(service.deleteSnippet('missing', PSY_ID)).rejects.toThrow(NotFoundException)
    })

    it('lista modelos decifrando o conteúdo', async () => {
      snippetRepo.find.mockResolvedValue([
        { id: 'snip-1', label: 'Sem risco', content: encrypt('Texto do modelo'), createdAt: new Date() },
      ])

      const list = await service.listSnippets(PSY_ID)

      expect(list[0].content).toBe('Texto do modelo')
    })
  })
})
