import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { JwtService } from '@nestjs/jwt'
import { ConflictException, HttpException, UnauthorizedException } from '@nestjs/common'
import { AuthService } from './auth.service'
import { User } from './entities/user.entity'
import { RefreshToken } from './entities/refresh-token.entity'
import { LoginAttempt } from './entities/login-attempt.entity'
import { EmailService } from '../email/email.service'
import { ReferralService } from '../referral/referral.service'
import { AsaasService } from '../billing/asaas.service'
import { AuditService } from '../audit/audit.service'
import { StorageService } from '../../common/storage/storage.service'
import { RiskEngineService } from '../../common/security/risk-engine.service'
import { SuspiciousActivityService } from '../../common/security/suspicious-activity.service'
import { hashPassword } from '../../common/password/password.util'

function mockRepo(overrides = {}) {
  return {
    findOneBy:      jest.fn(),
    findOne:        jest.fn(),
    find:           jest.fn(),
    create:         jest.fn((dto) => dto),
    save:           jest.fn((e) => Promise.resolve(e)),
    update:         jest.fn().mockResolvedValue(undefined),
    delete:         jest.fn().mockResolvedValue(undefined),
    count:          jest.fn().mockResolvedValue(0),
    createQueryBuilder: jest.fn().mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      where:     jest.fn().mockReturnThis(),
      getOne:    jest.fn().mockResolvedValue(null),
    }),
    ...overrides,
  }
}

async function makeUser(overrides = {}) {
  return {
    id: 'user-123', name: 'Test', email: 'test@example.com',
    passwordHash: await hashPassword('correct-password'),
    crp: '12345/SP', isActive: true, firstLogin: true,
    onboardingCompleted: false, onboardingStep: 0,
    emailVerified: true, patients: [],
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  }
}

async function createService(userRepoOverrides = {}, loginAttemptRepoOverrides = {}) {
  const userRepo         = mockRepo(userRepoOverrides)
  const refreshTokenRepo = mockRepo()
  const loginAttemptRepo = mockRepo(loginAttemptRepoOverrides)
  const dataSourceMock   = {
    transaction: jest.fn(async (cb) => cb({ getRepository: () => loginAttemptRepo, query: jest.fn() })),
    query:       jest.fn().mockResolvedValue([]),
  }

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      AuthService,
      { provide: getRepositoryToken(User),         useValue: userRepo },
      { provide: getRepositoryToken(RefreshToken), useValue: refreshTokenRepo },
      { provide: getRepositoryToken(LoginAttempt), useValue: loginAttemptRepo },
      { provide: DataSource,             useValue: dataSourceMock },
      { provide: JwtService,            useValue: { sign: jest.fn().mockReturnValue('jwt-token') } },
      { provide: EmailService,          useValue: { sendEmailVerification: jest.fn().mockResolvedValue(undefined), sendWelcome: jest.fn().mockResolvedValue(undefined), sendPasswordReset: jest.fn().mockResolvedValue(undefined) } },
      { provide: ReferralService,       useValue: { applyReferral: jest.fn().mockResolvedValue(undefined) } },
      { provide: AsaasService,          useValue: { cancelSubscription: jest.fn().mockResolvedValue(undefined) } },
      { provide: AuditService,          useValue: { record: jest.fn().mockResolvedValue(undefined) } },
      { provide: StorageService,        useValue: { isConfigured: jest.fn().mockReturnValue(false), upload: jest.fn(), delete: jest.fn(), keyFromUrl: jest.fn() } },
      { provide: RiskEngineService,     useValue: { assessLoginRisk: jest.fn().mockResolvedValue({ score: 0, level: 'low', signals: {} }) } },
      { provide: SuspiciousActivityService, useValue: { isIpBlocked: jest.fn().mockResolvedValue(false), recordFailedAttempt: jest.fn().mockResolvedValue(false) } },
    ],
  }).compile()

  return { service: module.get<AuthService>(AuthService), userRepo, refreshTokenRepo, loginAttemptRepo, module }
}

describe('AuthService', () => {

  describe('register', () => {
    it('deve rejeitar e-mail duplicado', async () => {
      const { service, userRepo } = await createService()
      userRepo.findOneBy.mockResolvedValue(await makeUser())
      await expect(service.register({ name: 'X', email: 'test@example.com', password: 'abc12345', crp: '1/SP', termsAccepted: true }))
        .rejects.toThrow(ConflictException)
    })

    it('deve rejeitar termsAccepted=false', async () => {
      const { service, userRepo } = await createService()
      userRepo.findOneBy.mockResolvedValue(null)
      await expect(service.register({ name: 'X', email: 'novo@example.com', password: 'abc12345', crp: '1/SP', termsAccepted: false }))
        .rejects.toThrow()
    })

    it('deve criar usuario com Argon2 e retornar tokens', async () => {
      const { service, userRepo, refreshTokenRepo } = await createService()
      userRepo.findOneBy.mockResolvedValue(null)
      userRepo.save.mockImplementation((u) => Promise.resolve({ ...u, id: 'new-id' }))
      refreshTokenRepo.save.mockResolvedValue({})
      const result = await service.register({ name: 'X', email: 'novo@example.com', password: 'abc12345', crp: '1/SP', termsAccepted: true })
      expect(result.tokens.accessToken).toBe('jwt-token')
      expect(result.csrfToken).toBeDefined()
      // Hash salvo deve ser Argon2
      const savedUser = userRepo.save.mock.calls[0][0]
      expect(savedUser.passwordHash).toMatch(/^\$argon2/)
    })
  })

  describe('login', () => {
    it('deve rejeitar senha errada com mensagem generica', async () => {
      const { service, userRepo, loginAttemptRepo } = await createService()
      userRepo.findOneBy.mockResolvedValue(await makeUser())
      loginAttemptRepo.findOneBy.mockResolvedValue(null)
      loginAttemptRepo.findOne.mockResolvedValue(null)
      await expect(service.login({ email: 'test@example.com', password: 'errada' }))
        .rejects.toMatchObject({ message: 'Credenciais invalidas' })
    })

    it('deve rejeitar usuario inexistente com mesma mensagem', async () => {
      const { service, userRepo, loginAttemptRepo } = await createService()
      userRepo.findOneBy.mockResolvedValue(null)
      loginAttemptRepo.findOneBy.mockResolvedValue(null)
      loginAttemptRepo.findOne.mockResolvedValue(null)
      await expect(service.login({ email: 'nao@existe.com', password: 'qualquer' }))
        .rejects.toMatchObject({ message: 'Credenciais invalidas' })
    })

    it('deve aceitar credenciais corretas e nao expor passwordHash', async () => {
      const { service, userRepo, loginAttemptRepo, refreshTokenRepo } = await createService()
      userRepo.findOneBy.mockResolvedValue(await makeUser())
      loginAttemptRepo.findOneBy.mockResolvedValue(null)
      loginAttemptRepo.delete.mockResolvedValue(undefined)
      refreshTokenRepo.save.mockResolvedValue({})
      const result = await service.login({ email: 'test@example.com', password: 'correct-password' })
      expect(result.user).not.toHaveProperty('passwordHash')
      expect(result.csrfToken).toBeDefined()
    })

    it('deve bloquear apos MAX_ATTEMPTS falhas', async () => {
      const { service, userRepo, loginAttemptRepo } = await createService()
      userRepo.findOneBy.mockResolvedValue(await makeUser())
      loginAttemptRepo.findOneBy.mockResolvedValue({
        email: 'test@example.com', count: 10,
        resetAt: new Date(Date.now() + 10 * 60 * 1000),
      })
      await expect(service.login({ email: 'test@example.com', password: 'correct-password' }))
        .rejects.toThrow(HttpException)
    })

    it('deve bloquear IP listado por SuspiciousActivityService', async () => {
      const { service, module } = await createService()
      const suspicious = module.get(SuspiciousActivityService)
      jest.spyOn(suspicious, 'isIpBlocked').mockResolvedValue(true)
      await expect(service.login({ email: 'test@example.com', password: 'qualquer' }, '1.2.3.4'))
        .rejects.toThrow(HttpException)
    })

    it('deve bloquear login com risk level critical e revogar sessoes', async () => {
      const { service, userRepo, loginAttemptRepo, refreshTokenRepo, module } = await createService()
      userRepo.findOneBy.mockResolvedValue(await makeUser())
      loginAttemptRepo.findOneBy.mockResolvedValue(null)
      loginAttemptRepo.findOne.mockResolvedValue(null)
      const riskEngine = module.get(RiskEngineService)
      jest.spyOn(riskEngine, 'assessLoginRisk').mockResolvedValue({ score: 90, level: 'critical', signals: { ipFailureCount: 20, accountRecentLockout: true, recentTokenReuse: true } })
      await expect(service.login({ email: 'test@example.com', password: 'correct-password' }, '1.2.3.4'))
        .rejects.toThrow(UnauthorizedException)
      expect(refreshTokenRepo.update).toHaveBeenCalledWith({ userId: 'user-123', revoked: false }, { revoked: true })
    })

    it('deve fazer rehash de senha bcrypt legada para Argon2', async () => {
      const { service, userRepo, loginAttemptRepo, refreshTokenRepo } = await createService()
      const bcrypt = require('bcryptjs')
      const bcryptHash = await bcrypt.hash('correct-password', 4)
      const user = await makeUser({ passwordHash: bcryptHash })
      userRepo.findOneBy.mockResolvedValue(user)
      loginAttemptRepo.findOneBy.mockResolvedValue(null)
      loginAttemptRepo.delete.mockResolvedValue(undefined)
      refreshTokenRepo.save.mockResolvedValue({})
      await service.login({ email: 'test@example.com', password: 'correct-password' })
      // Deve ter salvo o usuario com hash Argon2
      const savedUser = userRepo.save.mock.calls.find(call => call[0]?.passwordHash?.startsWith('$argon2'))?.[0]
      expect(savedUser).toBeDefined()
    })
  })

  describe('refresh', () => {
    it('deve rejeitar token ausente', async () => {
      const { service } = await createService()
      await expect(service.refresh('')).rejects.toThrow(UnauthorizedException)
    })

    it('deve detectar replay attack e revogar todas as sessoes', async () => {
      const { service, refreshTokenRepo } = await createService()
      refreshTokenRepo.createQueryBuilder.mockReturnValue({
        addSelect: jest.fn().mockReturnThis(),
        where:     jest.fn().mockReturnThis(),
        getOne:    jest.fn().mockResolvedValue({ id: 'rt-id', userId: 'user-123', revoked: true, expiresAt: new Date(Date.now() + 60_000) }),
      })
      await expect(service.refresh('some-token'))
        .rejects.toMatchObject({ message: 'Sessao comprometida. Faca login novamente.' })
      expect(refreshTokenRepo.update).toHaveBeenCalledWith({ userId: 'user-123' }, { revoked: true })
    })

    it('deve rejeitar token expirado', async () => {
      const { service, refreshTokenRepo } = await createService()
      refreshTokenRepo.createQueryBuilder.mockReturnValue({
        addSelect: jest.fn().mockReturnThis(),
        where:     jest.fn().mockReturnThis(),
        getOne:    jest.fn().mockResolvedValue({ id: 'rt-id', userId: 'user-123', revoked: false, expiresAt: new Date(Date.now() - 1000) }),
      })
      await expect(service.refresh('some-token'))
        .rejects.toMatchObject({ message: 'Sessao expirada. Faca login novamente.' })
    })
  })

  describe('forgotPassword', () => {
    it('deve retornar sem erro para e-mail inexistente (user enumeration protection)', async () => {
      const { service, userRepo } = await createService()
      userRepo.findOneBy.mockResolvedValue(null)
      await expect(service.forgotPassword('nao@existe.com')).resolves.toBeUndefined()
    })
  })

  describe('password.util', () => {
    it('deve gerar hash Argon2id', async () => {
      const { hashPassword } = await import('../../common/password/password.util')
      const hash = await hashPassword('minha-senha')
      expect(hash).toMatch(/^\$argon2id/)
    })

    it('deve verificar hash bcrypt legado com needsRehash=true', async () => {
      const { verifyPassword } = await import('../../common/password/password.util')
      const bcrypt = require('bcryptjs')
      const bcryptHash = await bcrypt.hash('senha', 4)
      const result = await verifyPassword('senha', bcryptHash)
      expect(result.valid).toBe(true)
      expect(result.needsRehash).toBe(true)
    })

    it('deve verificar hash Argon2 com needsRehash=false', async () => {
      const { hashPassword, verifyPassword } = await import('../../common/password/password.util')
      const hash = await hashPassword('senha')
      const result = await verifyPassword('senha', hash)
      expect(result.valid).toBe(true)
      expect(result.needsRehash).toBe(false)
    })
  })
})