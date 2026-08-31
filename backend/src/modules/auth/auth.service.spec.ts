import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { JwtService } from '@nestjs/jwt'
import { ConflictException, HttpException, UnauthorizedException } from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import { AuthService } from './auth.service'
import { User } from './entities/user.entity'
import { RefreshToken } from './entities/refresh-token.entity'
import { LoginAttempt } from './entities/login-attempt.entity'
import { EmailService } from '../email/email.service'
import { ReferralService } from '../referral/referral.service'
import { AsaasService } from '../billing/asaas.service'
import { AuditService } from '../audit/audit.service'
import { RiskEngineService } from '../../common/security/risk-engine.service'
import { SuspiciousActivityService } from '../../common/security/suspicious-activity.service'
import { StorageService } from '../../common/storage/storage.service'
import { PlanAccessService } from '../../common/plan-access/plan-access.service'

// ── Helpers ────────────────────────────────────────────────────────────────────

function mockRepo(overrides: Partial<Record<string, jest.Mock>> = {}) {
  const repo: any = {
    findOneBy:      jest.fn(),
    findOne:        jest.fn(),
    find:           jest.fn(),
    create:         jest.fn((dto: any) => dto),
    save:           jest.fn((entity: any) => Promise.resolve(entity)),
    update:         jest.fn().mockResolvedValue(undefined),
    delete:         jest.fn().mockResolvedValue(undefined),
    deleteStrict:   jest.fn().mockResolvedValue(undefined),
    count:          jest.fn().mockResolvedValue(0),
    ...overrides,
  }
  repo.createQueryBuilder = overrides.createQueryBuilder ?? jest.fn(() => ({
    setLock:   jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where:     jest.fn().mockReturnThis(),
    getOne:    jest.fn(() => repo.findOneBy({})),
  }))
  return repo
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id:            'user-123',
    name:          'Test User',
    email:         'test@example.com',
    passwordHash:  bcrypt.hashSync('correct-password', 1),
    crp:           '12345/SP',
    isActive:      true,
    firstLogin:    true,
    onboardingCompleted: false,
    onboardingStep: 0,
    emailVerified: true,
    patients:      [],
    createdAt:     new Date(),
    updatedAt:     new Date(),
    ...overrides,
  } as User
}

// ── Setup ──────────────────────────────────────────────────────────────────────

async function createService(
  userRepoOverrides = {},
  loginAttemptRepoOverrides = {},
) {
  const userRepo          = mockRepo(userRepoOverrides)
  const refreshTokenRepo  = mockRepo()
  const loginAttemptRepo  = mockRepo(loginAttemptRepoOverrides)

  const dataSourceMock = {
    transaction: jest.fn(async (cb: any) => cb({
      getRepository: (entity: any) => entity === RefreshToken
        ? refreshTokenRepo
        : entity === User
          ? userRepo
          : loginAttemptRepo,
      query: jest.fn(),
    })),
    query:       jest.fn().mockResolvedValue([]),
  }
  const storageMock = {
    isConfigured: jest.fn().mockReturnValue(false),
    upload: jest.fn(),
    delete: jest.fn(),
    deleteStrict: jest.fn().mockResolvedValue(undefined),
    keyFromUrl: jest.fn(),
  }

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      AuthService,
      { provide: getRepositoryToken(User),         useValue: userRepo },
      { provide: getRepositoryToken(RefreshToken), useValue: refreshTokenRepo },
      { provide: getRepositoryToken(LoginAttempt), useValue: loginAttemptRepo },
      { provide: DataSource, useValue: dataSourceMock },
      { provide: JwtService,   useValue: { sign: jest.fn().mockReturnValue('jwt-token') } },
      { provide: EmailService, useValue: { sendEmailVerification: jest.fn().mockResolvedValue(undefined), sendWelcome: jest.fn().mockResolvedValue(undefined), sendPasswordReset: jest.fn().mockResolvedValue(undefined) } },
      { provide: ReferralService, useValue: { applyReferral: jest.fn().mockResolvedValue(undefined) } },
      { provide: AsaasService,    useValue: { cancelSubscription: jest.fn().mockResolvedValue(undefined) } },
      { provide: AuditService,    useValue: { record: jest.fn().mockResolvedValue(undefined) } },
      { provide: RiskEngineService, useValue: { assessLoginRisk: jest.fn().mockResolvedValue({ score: 0, level: 'low', signals: {} }) } },
      { provide: SuspiciousActivityService, useValue: { isIpBlocked: jest.fn().mockResolvedValue(false), recordFailedAttempt: jest.fn().mockResolvedValue(undefined) } },
      { provide: StorageService,  useValue: storageMock },
      { provide: PlanAccessService, useValue: { hasAccess: jest.fn().mockResolvedValue(false), getCurrentPlan: jest.fn().mockResolvedValue('free') } },
    ],
  }).compile()

  const service = module.get<AuthService>(AuthService)
  return { service, userRepo, refreshTokenRepo, loginAttemptRepo, dataSourceMock, storageMock }
}

// ── Testes ─────────────────────────────────────────────────────────────────────

describe('AuthService', () => {

  describe('register', () => {
    it('deve rejeitar e-mail duplicado', async () => {
      const { service, userRepo } = await createService()
      userRepo.findOneBy.mockResolvedValue(makeUser())

      await expect(service.register({
        name: 'Novo', email: 'test@example.com', password: 'senha1234',
        crp: '12345/SP', phone: '11987654321', termsAccepted: true, termsVersion: '2026-05-02',
      })).rejects.toThrow(ConflictException)
    })

    it('deve rejeitar quando termsAccepted é false', async () => {
      const { service, userRepo } = await createService()
      userRepo.findOneBy.mockResolvedValue(null)

      await expect(service.register({
        name: 'Novo', email: 'novo@example.com', password: 'senha1234',
        crp: '12345/SP', phone: '11987654321', termsAccepted: false,
      })).rejects.toThrow()
    })

    it('deve criar usuário com emailVerified=false e retornar tokens', async () => {
      const { service, userRepo, refreshTokenRepo } = await createService()
      userRepo.findOneBy.mockResolvedValue(null)
      userRepo.save.mockImplementation((u: any) => Promise.resolve({ ...u, id: 'new-id' }))
      refreshTokenRepo.save.mockResolvedValue({})

      const result = await service.register({
        name: 'Novo', email: 'novo@example.com', password: 'senha1234',
        crp: '12345/SP', phone: '11987654321', termsAccepted: true, termsVersion: '2026-05-02',
      })

      expect(result.user).toBeDefined()
      expect(result.csrfToken).toBeDefined()
      expect(result.tokens.accessToken).toBe('jwt-token')
    })
  })

  describe('login', () => {
    it('deve rejeitar senha errada sem revelar qual campo errou', async () => {
      const { service, userRepo, loginAttemptRepo } = await createService()
      userRepo.findOneBy.mockResolvedValue(makeUser())
      loginAttemptRepo.findOneBy.mockResolvedValue(null)
      loginAttemptRepo.findOne.mockResolvedValue(null)

      await expect(service.login({ email: 'test@example.com', password: 'senha-errada' }))
        .rejects.toThrow(UnauthorizedException)

      // Mensagem genérica — não diz se o e-mail ou a senha estão errados
      await expect(service.login({ email: 'test@example.com', password: 'senha-errada' }))
        .rejects.toMatchObject({ message: 'Credenciais inválidas' })
    })

    it('deve rejeitar login quando usuário não existe (mesma mensagem)', async () => {
      const { service, userRepo, loginAttemptRepo } = await createService()
      userRepo.findOneBy.mockResolvedValue(null)
      loginAttemptRepo.findOneBy.mockResolvedValue(null)
      loginAttemptRepo.findOne.mockResolvedValue(null)

      await expect(service.login({ email: 'inexistente@example.com', password: 'qualquer' }))
        .rejects.toMatchObject({ message: 'Credenciais inválidas' })
    })

    it('deve aceitar credenciais corretas e retornar user + tokens + csrfToken', async () => {
      const { service, userRepo, loginAttemptRepo, refreshTokenRepo } = await createService()
      userRepo.findOneBy.mockResolvedValue(makeUser())
      loginAttemptRepo.findOneBy.mockResolvedValue(null)
      loginAttemptRepo.delete.mockResolvedValue(undefined)
      refreshTokenRepo.save.mockResolvedValue({})

      const result = await service.login({ email: 'test@example.com', password: 'correct-password' })

      expect(result.user.email).toBe('test@example.com')
      expect(result.user).not.toHaveProperty('passwordHash')
      expect(result.csrfToken).toBeDefined()
      expect(result.tokens.accessToken).toBe('jwt-token')
    })

    it('deve bloquear após atingir MAX_ATTEMPTS', async () => {
      const { service, userRepo, loginAttemptRepo } = await createService()
      userRepo.findOneBy.mockResolvedValue(makeUser())

      const blockedEntry = {
        email: 'test@example.com',
        count: 10,
        resetAt: new Date(Date.now() + 10 * 60 * 1000),
      }
      loginAttemptRepo.findOneBy.mockResolvedValue(blockedEntry)

      await expect(service.login({ email: 'test@example.com', password: 'correct-password' }))
        .rejects.toThrow(HttpException)
    })

    it('não deve expor passwordHash no objeto retornado', async () => {
      const { service, userRepo, loginAttemptRepo, refreshTokenRepo } = await createService()
      userRepo.findOneBy.mockResolvedValue(makeUser())
      loginAttemptRepo.findOneBy.mockResolvedValue(null)
      loginAttemptRepo.delete.mockResolvedValue(undefined)
      refreshTokenRepo.save.mockResolvedValue({})

      const result = await service.login({ email: 'test@example.com', password: 'correct-password' })

      expect(result.user).not.toHaveProperty('passwordHash')
      expect(result.user).not.toHaveProperty('resetPasswordToken')
      expect(result.user).not.toHaveProperty('emailVerificationToken')
    })
  })

  describe('refresh', () => {
    it('deve rejeitar token ausente', async () => {
      const { service } = await createService()
      await expect(service.refresh('')).rejects.toThrow(UnauthorizedException)
    })

    it('deve detectar replay attack e revogar todas as sessões', async () => {
      const { service, refreshTokenRepo } = await createService()

      const revokedToken = {
        id:       'rt-id',
        userId:   'user-123',
        revoked:  true,
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 60_000),
      }
      refreshTokenRepo.createQueryBuilder.mockReturnValue({
        setLock:   jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where:     jest.fn().mockReturnThis(),
        getOne:    jest.fn().mockResolvedValue(revokedToken),
      })

      await expect(service.refresh('some-raw-token'))
        .rejects.toMatchObject({ message: 'Sessão comprometida. Faça login novamente.' })

      // Deve revogar TODOS os tokens do usuário comprometido
      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        { userId: 'user-123' },
        { revoked: true },
      )
    })

    it('deve rejeitar token expirado', async () => {
      const { service, refreshTokenRepo } = await createService()

      const expiredToken = {
        id:       'rt-id',
        userId:   'user-123',
        revoked:  false,
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() - 1000),
      }
      refreshTokenRepo.createQueryBuilder.mockReturnValue({
        setLock:   jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where:     jest.fn().mockReturnThis(),
        getOne:    jest.fn().mockResolvedValue(expiredToken),
      })

      await expect(service.refresh('some-raw-token'))
        .rejects.toMatchObject({ message: 'Sessão expirada. Faça login novamente.' })
    })
  })

  describe('forgotPassword', () => {
    it('deve retornar sem erro mesmo quando e-mail não existe (user enumeration protection)', async () => {
      const { service, userRepo } = await createService()
      userRepo.findOneBy.mockResolvedValue(null)

      await expect(service.forgotPassword('inexistente@example.com')).resolves.toBeUndefined()
    })
  })

  describe('deleteAccount', () => {
    it('não apaga o banco se um anexo externo não puder ser removido', async () => {
      const { service, userRepo, dataSourceMock, storageMock } = await createService()
      userRepo.findOneBy.mockResolvedValue(makeUser())
      dataSourceMock.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ storageKey: 'patients/user-123/anexo.pdf' }])
      storageMock.deleteStrict.mockRejectedValueOnce(new Error('storage indisponível'))

      await expect(service.deleteAccount('user-123', 'correct-password'))
        .rejects.toThrow('storage indisponível')

      expect(dataSourceMock.transaction).not.toHaveBeenCalled()
    })
  })
})
