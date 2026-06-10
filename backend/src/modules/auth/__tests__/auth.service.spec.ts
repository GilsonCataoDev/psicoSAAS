import { ConflictException, HttpException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Test } from '@nestjs/testing'
import { DataSource } from 'typeorm'
import * as bcrypt from 'bcryptjs'
import { AuthService } from '../auth.service'
import { User } from '../entities/user.entity'
import { RefreshToken } from '../entities/refresh-token.entity'
import { EmailService } from '../../email/email.service'
import { ReferralService } from '../../referral/referral.service'

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  passwordHash: '',
  isActive: true,
  emailVerified: true,
  crp: '01/123456',
  specialty: 'Clínica Geral',
  phone: null,
  avatarUrl: null,
  preferences: {},
  onboarding: null,
  termsAcceptedAt: new Date(),
  termsVersion: '2026-05-02',
  resetPasswordToken: undefined,
  resetPasswordExpiry: undefined,
  emailVerificationToken: undefined,
  emailVerificationExpiry: undefined,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
} as User)

const makeRefreshToken = (overrides: Partial<RefreshToken> = {}): RefreshToken => ({
  id: 'rt-1',
  userId: 'user-1',
  tokenHash: 'hashed',
  revoked: false,
  expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
  createdAt: new Date(),
  ip: null,
  userAgent: null,
  ...overrides,
} as RefreshToken)

function makeRepo<T>(overrides: Partial<Record<keyof T, jest.Mock>> = {}) {
  return {
    findOneBy: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(v => v),
    update: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    })),
    ...overrides,
  }
}

describe('AuthService', () => {
  let service: AuthService
  let usersRepo: ReturnType<typeof makeRepo>
  let rtRepo: ReturnType<typeof makeRepo>

  beforeEach(async () => {
    usersRepo = makeRepo()
    rtRepo    = makeRepo()

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User),         useValue: usersRepo },
        { provide: getRepositoryToken(RefreshToken), useValue: rtRepo },
        { provide: JwtService,     useValue: { sign: jest.fn().mockReturnValue('access-token') } },
        { provide: EmailService,   useValue: { sendEmailVerification: jest.fn().mockResolvedValue(undefined), sendWelcome: jest.fn().mockResolvedValue(undefined), sendPasswordReset: jest.fn().mockResolvedValue(undefined) } },
        { provide: ReferralService, useValue: { applyReferral: jest.fn() } },
        { provide: DataSource, useValue: {} },
      ],
    }).compile()

    service = module.get(AuthService)
  })

  // ── Brute-force protection ──────────────────────────────────────────────────

  describe('login brute-force', () => {
    it('throws after 10 failed attempts', async () => {
      const email = 'brute@example.com'
      usersRepo.findOneBy.mockResolvedValue(null)

      for (let i = 0; i < 10; i++) {
        await service.login({ email, password: 'wrong' }).catch(() => {})
      }

      await expect(service.login({ email, password: 'wrong' }))
        .rejects.toThrow(HttpException)
    })

    it('succeeds after rate-limit window resets', async () => {
      const email = 'timed@example.com'
      const hash = await bcrypt.hash('correct', 12)
      const user = makeUser({ email, passwordHash: hash })

      usersRepo.findOneBy.mockResolvedValue(null)

      for (let i = 0; i < 9; i++) {
        await service.login({ email, password: 'wrong' }).catch(() => {})
      }

      // Reset internal counter by patching private map (white-box)
      ;(service as any).loginAttempts.delete(email)

      usersRepo.findOneBy.mockResolvedValue(user)
      rtRepo.create.mockReturnValue(makeRefreshToken())
      rtRepo.save.mockResolvedValue(makeRefreshToken())

      const result = await service.login({ email, password: 'correct' })
      expect(result.user.email).toBe(email)
    })
  })

  // ── Refresh token replay detection ─────────────────────────────────────────

  describe('refresh token replay', () => {
    it('revokes all sessions when a revoked token is replayed', async () => {
      const revokedRt = makeRefreshToken({ revoked: true })
      const qb = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(revokedRt),
      }
      rtRepo.createQueryBuilder.mockReturnValue(qb)
      rtRepo.update.mockResolvedValue({})

      await expect(service.refresh('raw-token'))
        .rejects.toThrow(UnauthorizedException)

      expect(rtRepo.update).toHaveBeenCalledWith(
        { userId: revokedRt.userId },
        { revoked: true },
      )
    })

    it('throws when token not found', async () => {
      const qb = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      }
      rtRepo.createQueryBuilder.mockReturnValue(qb)

      await expect(service.refresh('unknown')).rejects.toThrow(UnauthorizedException)
    })

    it('throws when token is expired', async () => {
      const expiredRt = makeRefreshToken({ expiresAt: new Date(Date.now() - 1000) })
      const qb = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(expiredRt),
      }
      rtRepo.createQueryBuilder.mockReturnValue(qb)

      await expect(service.refresh('raw-token')).rejects.toThrow(UnauthorizedException)
    })
  })

  // ── Email verification expiry ───────────────────────────────────────────────

  describe('verifyEmail', () => {
    it('rejects expired tokens', async () => {
      usersRepo.findOneBy.mockResolvedValue(makeUser({
        emailVerified: false,
        emailVerificationExpiry: new Date(Date.now() - 1000),
      }))

      await expect(service.verifyEmail('expired-token')).rejects.toThrow()
    })

    it('marks email as verified on valid token', async () => {
      const user = makeUser({
        emailVerified: false,
        emailVerificationExpiry: new Date(Date.now() + 3600 * 1000),
      })
      usersRepo.findOneBy.mockResolvedValue(user)
      usersRepo.save.mockResolvedValue({ ...user, emailVerified: true })

      const result = await service.verifyEmail('valid-token')
      expect(result.message).toContain('verificado')
      expect(usersRepo.save).toHaveBeenCalledWith(expect.objectContaining({ emailVerified: true }))
    })
  })

  // ── Forgot password no-user-enumeration ────────────────────────────────────

  describe('forgotPassword', () => {
    it('returns undefined without throwing when email not found', async () => {
      usersRepo.findOneBy.mockResolvedValue(null)

      const result = await service.forgotPassword('nobody@example.com')
      expect(result).toBeUndefined()
    })
  })

  // ── register conflict ───────────────────────────────────────────────────────

  describe('register', () => {
    it('throws ConflictException for duplicate email', async () => {
      usersRepo.findOneBy.mockResolvedValue(makeUser())

      await expect(
        service.register({
          name: 'Test',
          email: 'test@example.com',
          password: 'Password1!',
          crp: '01/123456',
          specialty: 'Clínica Geral',
          termsAccepted: true,
          termsVersion: '2026-05-02',
        }),
      ).rejects.toThrow(ConflictException)
    })
  })
})
