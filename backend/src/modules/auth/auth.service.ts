import {
  BadRequestException, ConflictException, ForbiddenException, HttpException, HttpStatus,
  Injectable, Logger, NotFoundException, UnauthorizedException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { JwtService } from '@nestjs/jwt'
import { randomBytes } from 'crypto'
import { generateCsrfToken, hashToken } from '../../common/crypto/encrypt.util'
import { hashPassword, verifyPassword, DUMMY_ARGON2_HASH } from '../../common/password/password.util'
import { getAdminEmails } from '../../common/guards/admin.guard'
import { RiskEngineService } from '../../common/security/risk-engine.service'
import { SuspiciousActivityService } from '../../common/security/suspicious-activity.service'
import { StorageService } from '../../common/storage/storage.service'
import { User }         from './entities/user.entity'
import { RefreshToken } from './entities/refresh-token.entity'
import { LoginAttempt } from './entities/login-attempt.entity'
import { RegisterDto }          from './dto/register.dto'
import { LoginDto }             from './dto/login.dto'
import { UpdateProfileDto }     from './dto/update-profile.dto'
import { UpdatePreferencesDto } from './dto/update-preferences.dto'
import { UpdateOnboardingDto }  from './dto/update-onboarding.dto'
import { EmailService }   from '../email/email.service'
import { ReferralService } from '../referral/referral.service'
import { AsaasService } from '../billing/asaas.service'
import { AuditService } from '../audit/audit.service'

// ── Tipagem de retorno ─────────────────────────────────────────────────────────
export interface AuthTokens {
  accessToken:  string
  refreshToken: string
}

export interface SafeUser extends Omit<
  User,
  'passwordHash' | 'resetPasswordToken' | 'resetPasswordExpiry' | 'emailVerificationToken' | 'emailVerificationExpiry'
> {
  isAdmin?: boolean
  impersonatedBy?: string
  impersonatedByEmail?: string
}

export interface ImpersonationResult {
  accessToken: string
  csrfToken: string
  user: SafeUser
}

export interface AuthResult {
  user:      SafeUser
  tokens:    AuthTokens
  csrfToken: string
}

export const CURRENT_TERMS_VERSION = '2026-05-02'

@Injectable()
export class AuthService {
  private readonly logger      = new Logger(AuthService.name)
  private readonly auditLogger = new Logger('AuditLog')

  /** Brute-force protection: max 10 falhas por email em 15 minutos */
  private readonly MAX_ATTEMPTS = 10
  private readonly WINDOW_MS    = 15 * 60 * 1000

  constructor(
    @InjectRepository(User)         private users:         Repository<User>,
    @InjectRepository(RefreshToken) private rtRepo:        Repository<RefreshToken>,
    @InjectRepository(LoginAttempt) private loginAttempts: Repository<LoginAttempt>,
    private dataSource:    DataSource,
    private jwt:           JwtService,
    private email:         EmailService,
    private referral:      ReferralService,
    private asaas:         AsaasService,
    private auditService:  AuditService,
    private riskEngine:    RiskEngineService,
    private suspicious:    SuspiciousActivityService,
    private storage:       StorageService,
  ) {}

  // ── Registro ───────────────────────────────────────────────────────────────

  async register(dto: RegisterDto, ip?: string, userAgent?: string): Promise<AuthResult> {
    const exists = await this.users.findOneBy({ email: dto.email.toLowerCase() })
    if (exists) throw new ConflictException('E-mail já cadastrado')
    if (!dto.termsAccepted) {
      throw new BadRequestException('E necessario aceitar os Termos de Uso')
    }

    const { referralCode, password, termsAccepted: _termsAccepted, termsVersion, ...userData } = dto
    const passwordHash = await hashPassword(password)
    const verificationToken = randomBytes(32).toString('hex')
    const user = this.users.create({
      ...userData,
      email: userData.email.toLowerCase(),
      passwordHash,
      emailVerified: false,
      emailVerificationToken: hashToken(verificationToken),
      emailVerificationExpiry: new Date(Date.now() + 48 * 60 * 60 * 1000),
      termsAcceptedAt: new Date(),
      termsVersion: termsVersion ?? CURRENT_TERMS_VERSION,
    })
    await this.users.save(user)

    if (referralCode) {
      await this.referral.applyReferral(referralCode, user).catch((err) => {
        this.logger.warn(`[Register] Falha ao aplicar indicacao user=${user.id}: ${err?.message ?? err}`)
      })
    }

    this.email.sendEmailVerification(user.name, user.email, verificationToken)
      .catch(err => this.logger.error(`[Register] Falha ao enviar verificacao user=${user.id}: ${err?.message}`))
    this.email.sendWelcome(user.name, user.email)
      .catch(err => this.logger.error(`[Register] Falha ao enviar boas-vindas user=${user.id}: ${err?.message}`))
    this.audit('REGISTER', { userId: user.id, ip })

    return this.buildResult(user, ip, userAgent)
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    if (!token) throw new BadRequestException('Token ausente')

    const user = await this.users.findOneBy({ emailVerificationToken: hashToken(token) })
    if (!user || !user.emailVerificationExpiry || user.emailVerificationExpiry < new Date()) {
      throw new BadRequestException('Link invalido ou expirado. Solicite um novo.')
    }

    user.emailVerified = true
    user.emailVerificationToken = undefined
    user.emailVerificationExpiry = undefined
    await this.users.save(user)

    this.audit('EMAIL_VERIFIED', { userId: user.id })
    return { message: 'E-mail verificado com sucesso.' }
  }

  async resendEmailVerification(userId: string): Promise<{ message: string }> {
    const user = await this.users.findOneBy({ id: userId })
    if (!user) throw new NotFoundException()
    if (user.emailVerified) return { message: 'Seu e-mail ja esta verificado.' }

    const token = randomBytes(32).toString('hex')
    user.emailVerificationToken = hashToken(token)
    user.emailVerificationExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000)
    await this.users.save(user)

    await this.email.sendEmailVerification(user.name, user.email, token)
    this.audit('EMAIL_VERIFICATION_RESENT', { userId: user.id })
    return { message: 'Enviamos um novo link de verificacao para seu e-mail.' }
  }

  // ── Login ──────────────────────────────────────────────────────────────────

  async login(dto: LoginDto, ip?: string, userAgent?: string): Promise<AuthResult> {
    const email = dto.email.toLowerCase()

    // Bloqueia IPs com ataques cross-account (credential stuffing)
    if (ip && await this.suspicious.isIpBlocked(ip)) {
      this.audit('LOGIN_IP_BLOCKED', { email: this.maskEmail(email), ip })
      throw new HttpException(
        { message: 'Acesso temporariamente bloqueado. Tente novamente em 15 minutos.' },
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    // Rate limit por email (brute-force direcionado)
    await this.checkLoginRateLimit(email, ip)

    const user = await this.users.findOneBy({ email })

    // Tempo constante mesmo se user nao existe (previne timing attack)
    const hash  = user?.passwordHash ?? DUMMY_ARGON2_HASH
    const { valid, needsRehash } = await verifyPassword(dto.password, hash)

    if (!user || !valid) {
      await this.recordLoginFailure(email)
      await this.suspicious.recordFailedAttempt(ip ?? '', email)
      this.audit('LOGIN_FAILED', { email: this.maskEmail(email), ip })
      throw new UnauthorizedException('Credenciais invalidas')
    }

    if (user.isActive === false) {
      this.audit('LOGIN_BLOCKED_INACTIVE', { userId: user.id, ip })
      throw new UnauthorizedException('Conta desativada. Contate o suporte.')
    }

    // Rehash transparente de bcrypt legado para Argon2id
    if (needsRehash) {
      user.passwordHash = await hashPassword(dto.password)
      await this.users.save(user)
      this.audit('PASSWORD_REHASHED_ARGON2', { userId: user.id })
    }

    // Risk engine: avalia sinais de ameaca apos senha valida
    const risk = await this.riskEngine.assessLoginRisk(user.id, ip ?? '')

    if (risk.level === 'critical') {
      // Revoga todas as sessoes e bloqueia login
      await this.rtRepo.update({ userId: user.id, revoked: false }, { revoked: true })
      await this.auditService.record({
        userId: user.id,
        action: 'LOGIN_BLOCKED_CRITICAL_RISK',
        resource: 'auth',
        ip,
        metadata: { score: risk.score, signals: risk.signals },
      })
      this.audit('LOGIN_BLOCKED_CRITICAL_RISK', { userId: user.id, ip, score: String(risk.score) })
      throw new UnauthorizedException('Login bloqueado por atividade suspeita. Faca login novamente ou contate o suporte.')
    }

    if (risk.level === 'high' || risk.level === 'medium') {
      await this.auditService.record({
        userId: user.id,
        action: `LOGIN_RISK_${risk.level.toUpperCase()}`,
        resource: 'auth',
        ip,
        metadata: { score: risk.score, signals: risk.signals },
      })
    }

    await this.clearLoginAttempts(email)
    this.audit('LOGIN_SUCCESS', { userId: user.id, ip })

    return this.buildResult(user, ip, userAgent)
  }

  // ── Refresh Token ──────────────────────────────────────────────────────────

  async refresh(rawToken: string, ip?: string, userAgent?: string): Promise<AuthResult> {
    if (!rawToken) throw new UnauthorizedException('Refresh token ausente')

    const tokenHash = hashToken(rawToken)
    const rt = await this.rtRepo
      .createQueryBuilder('rt')
      .addSelect('rt.tokenHash')
      .where('rt.tokenHash = :tokenHash', { tokenHash })
      .getOne()

    if (!rt) {
      throw new UnauthorizedException('Sessao invalida. Faca login novamente.')
    }

    if (rt.revoked) {
      await this.rtRepo.update({ userId: rt.userId }, { revoked: true })
      this.audit('REFRESH_REPLAY_DETECTED', { userId: rt.userId, ip })
      throw new UnauthorizedException('Sessao comprometida. Faca login novamente.')
    }

    if (new Date() > rt.expiresAt) {
      throw new UnauthorizedException('Sessao expirada. Faca login novamente.')
    }

    await this.rtRepo.update(rt.id, { revoked: true })

    const user = await this.users.findOneBy({ id: rt.userId })
    if (!user) throw new UnauthorizedException('Usuario nao encontrado')

    if (user.isActive === false) {
      await this.rtRepo.update({ userId: user.id, revoked: false }, { revoked: true })
      this.audit('REFRESH_BLOCKED_INACTIVE', { userId: user.id, ip })
      throw new UnauthorizedException('Conta desativada. Contate o suporte.')
    }

    this.audit('REFRESH_TOKEN_ROTATED', { userId: user.id, ip })

    return this.buildResult(user, ip, userAgent)
  }

  async revokeAllTokens(userId: string, ip?: string): Promise<void> {
    await this.rtRepo.update({ userId, revoked: false }, { revoked: true })
    this.audit('LOGOUT', { userId, ip })
  }

  // ── Impersonacao (admin "ver como") ─────────────────────────────────────────

  async impersonate(admin: { id: string; email: string }, targetUserId: string, ip?: string): Promise<ImpersonationResult> {
    if (targetUserId === admin.id) {
      throw new BadRequestException('Voce ja esta autenticado como voce mesmo')
    }

    const target = await this.users.findOneBy({ id: targetUserId })
    if (!target) throw new NotFoundException('Usuario nao encontrado')

    if (getAdminEmails().includes(target.email.toLowerCase())) {
      throw new ForbiddenException('Nao e possivel visualizar como outro administrador')
    }

    const csrfSeed = randomBytes(16).toString('hex')
    const accessToken = this.jwt.sign(
      {
        sub: target.id,
        email: target.email,
        csrfSeed,
        impersonatedBy: admin.id,
        impersonatedByEmail: admin.email,
      },
      { expiresIn: '15m' },
    )
    const csrfToken = generateCsrfToken(target.id, csrfSeed)

    await this.auditService.record({
      userId: admin.id,
      action: 'admin.impersonation_started',
      resource: 'user',
      resourceId: target.id,
      metadata: { targetEmail: target.email },
      ip,
    })
    this.audit('ADMIN_IMPERSONATION_STARTED', { adminId: admin.id, targetUserId: target.id, ip })

    const user = this.toSafeUser(target)
    user.impersonatedBy = admin.id
    user.impersonatedByEmail = admin.email

    return { accessToken, csrfToken, user }
  }

  // ── Perfil ─────────────────────────────────────────────────────────────────

  async findById(id: string): Promise<User | null> {
    const user = await this.users.findOneBy({ id })
    if (user?.preferences) user.preferences = this.exposePreferences(user.preferences)
    return user
  }

  async updateProfile(id: string, data: UpdateProfileDto): Promise<SafeUser> {
    const user = await this.users.findOneBy({ id })
    if (!user) throw new NotFoundException()
    Object.assign(user, data)
    await this.users.save(user)
    return this.toSafeUser(user)
  }

  async updateAvatar(id: string, buffer: Buffer): Promise<SafeUser> {
    const user = await this.users.findOneBy({ id })
    if (!user) throw new NotFoundException()

    if (this.storage.isConfigured()) {
      if (user.avatarUrl && !user.avatarUrl.startsWith('data:')) {
        const oldKey = this.storage.keyFromUrl(user.avatarUrl)
        if (oldKey) await this.storage.delete(oldKey)
      }
      const key = `avatars/${id}-${Date.now()}.jpg`
      user.avatarUrl = await this.storage.upload(key, buffer, 'image/jpeg')
    } else {
      user.avatarUrl = `data:image/jpeg;base64,${buffer.toString('base64')}`
    }

    await this.users.save(user)
    return this.toSafeUser(user)
  }

  async updatePreferences(id: string, preferences: UpdatePreferencesDto): Promise<Record<string, unknown>> {
    const user = await this.users.findOneBy({ id })
    if (!user) throw new NotFoundException()

    const sanitizedPreferences: Record<string, unknown> = { ...preferences }
    const next = { ...(user.preferences ?? {}), ...sanitizedPreferences }
    delete next.asaasApiKey
    user.preferences = next
    await this.users.save(user)
    return this.exposePreferences(user.preferences!)
  }

  async updateOnboarding(id: string, data: UpdateOnboardingDto): Promise<SafeUser> {
    const user = await this.users.findOneBy({ id })
    if (!user) throw new NotFoundException()
    if (typeof data.firstLogin === 'boolean') user.firstLogin = data.firstLogin
    if (typeof data.onboardingStep === 'number') user.onboardingStep = data.onboardingStep
    await this.users.save(user)
    return this.toSafeUser(user)
  }

  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.users.findOneBy({ id })
    if (!user) throw new NotFoundException()
    const { valid } = await verifyPassword(currentPassword, user.passwordHash)
    if (!valid) throw new UnauthorizedException('Credenciais invalidas')
    user.passwordHash = await hashPassword(newPassword)
    await this.users.save(user)
    this.audit('PASSWORD_CHANGED', { userId: id })
    return { message: 'Senha alterada com sucesso' }
  }

  async deleteAccount(id: string, password: string, ip?: string): Promise<void> {
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id })
      .getOne()

    if (!user) throw new NotFoundException()

    const { valid } = await verifyPassword(password, user.passwordHash)
    if (!valid) throw new UnauthorizedException('Senha invalida')

    const subscriptions = await this.dataSource.query(
      `SELECT "gatewaySubscriptionId"
         FROM "billing_subscriptions"
        WHERE "userId" = $1
          AND "gatewaySubscriptionId" IS NOT NULL
          AND "status" <> 'canceled'`,
      [id],
    )

    for (const subscription of subscriptions) {
      await this.asaas.cancelSubscription(subscription.gatewaySubscriptionId)
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.query('DELETE FROM "referrals" WHERE "referrerId"::text = $1::text OR "referredId"::text = $1::text', [id])
      await manager.query('DELETE FROM "tenant_alerts" WHERE "userId" = $1', [id])
      await manager.query('DELETE FROM "tenant_health" WHERE "userId" = $1', [id])
      await manager.query('DELETE FROM "tenant_activations" WHERE "userId" = $1', [id])
      await manager.query('DELETE FROM "testimonials" WHERE "userId" = $1', [id])
      await manager.query('DELETE FROM "ai_usage" WHERE "userId" = $1', [id])
      await manager.query('DELETE FROM "whatsapp_delivery_logs" WHERE "userId" = $1', [id])
      await manager.query('DELETE FROM "documents" WHERE "userId" = $1', [id])
      await manager.query('DELETE FROM "instrument_assignments" WHERE "psychologistId" = $1', [id])
      await manager.query('DELETE FROM "push_subscriptions" WHERE "userId" = $1', [id])
      await manager.query('DELETE FROM "billing_subscriptions" WHERE "userId" = $1', [id])
      await manager.query('DELETE FROM "financial_records" WHERE "psychologistId" = $1', [id])
      await manager.query('DELETE FROM "sessions" WHERE "psychologistId" = $1', [id])
      await manager.query('DELETE FROM "appointments" WHERE "psychologistId" = $1', [id])
      await manager.query('DELETE FROM "bookings" WHERE "psychologistId" = $1', [id])
      await manager.query('DELETE FROM "booking_pages" WHERE "psychologistId" = $1', [id])
      await manager.query('DELETE FROM "availability_slots" WHERE "psychologistId" = $1', [id])
      await manager.query('DELETE FROM "blocked_dates" WHERE "psychologistId" = $1', [id])
      await manager.query('DELETE FROM "patients" WHERE "psychologistId" = $1', [id])
      await manager.query('DELETE FROM "refresh_tokens" WHERE "userId" = $1', [id])
      await manager.query('DELETE FROM "audit_logs" WHERE "userId"::text = $1::text', [id])
      await manager.query('DELETE FROM "login_attempts" WHERE "email" = $1', [user.email])
      await manager.query('DELETE FROM "email_logs" WHERE "to" = $1', [user.email])
      await manager.query('DELETE FROM "users" WHERE "id" = $1', [id])
    })

    this.audit('ACCOUNT_DELETED', { userId: id, ip })
  }

  // ── Recuperacao de senha ───────────────────────────────────────────────────

  async forgotPassword(email: string): Promise<void> {
    const user = await this.users.findOneBy({ email: email.toLowerCase().trim() })
    if (!user) return

    const token = randomBytes(32).toString('hex')
    user.resetPasswordToken  = hashToken(token)
    user.resetPasswordExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000)
    await this.users.save(user)

    this.email.sendPasswordReset(user.name, user.email, token).catch(() => {})
    this.audit('PASSWORD_RESET_REQUESTED', { email: this.maskEmail(email) })
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    if (!token || !newPassword) throw new BadRequestException('Dados invalidos')
    if (newPassword.length < 8) throw new BadRequestException('A senha deve ter pelo menos 8 caracteres')

    const user = await this.users.findOneBy({ resetPasswordToken: hashToken(token) })
    if (!user || !user.resetPasswordExpiry || user.resetPasswordExpiry < new Date()) {
      throw new BadRequestException('Link invalido ou expirado. Solicite um novo.')
    }

    user.passwordHash        = await hashPassword(newPassword)
    user.resetPasswordToken  = undefined
    user.resetPasswordExpiry = undefined
    await this.users.save(user)

    await this.rtRepo.update({ userId: user.id }, { revoked: true })
    this.audit('PASSWORD_RESET_SUCCESS', { userId: user.id })
  }

  // ── CSRF ───────────────────────────────────────────────────────────────────

  generateCsrfToken(userId: string, csrfSeed?: string): string {
    return generateCsrfToken(userId, csrfSeed)
  }

  // ── Internos ───────────────────────────────────────────────────────────────

  private async buildResult(
    user: User,
    ip?: string,
    userAgent?: string,
  ): Promise<AuthResult> {
    const csrfSeed    = randomBytes(16).toString('hex')
    const accessToken = this.jwt.sign(
      { sub: user.id, email: user.email, csrfSeed },
      { expiresIn: '15m' },
    )

    const refreshToken = await this.createRefreshToken(user.id, ip, userAgent)
    const csrfToken    = generateCsrfToken(user.id, csrfSeed)
    const safeUser     = this.toSafeUser(user)

    return { user: safeUser, tokens: { accessToken, refreshToken }, csrfToken }
  }

  private toSafeUser(user: User): SafeUser {
    const {
      passwordHash: _,
      resetPasswordToken: __,
      resetPasswordExpiry: ___,
      emailVerificationToken: ____,
      emailVerificationExpiry: _____,
      ...safeUser
    } = user
    if (safeUser.preferences) safeUser.preferences = this.exposePreferences(safeUser.preferences)
    const result: SafeUser = safeUser as SafeUser
    result.isAdmin = getAdminEmails().includes(user.email.toLowerCase())
    return result
  }

  private exposePreferences(preferences: Record<string, unknown>): Record<string, unknown> {
    const safe: Record<string, unknown> = { ...preferences }
    delete safe.asaasApiKey
    delete safe.googleCalendarAccessToken
    delete safe.googleCalendarRefreshToken
    delete safe.googleCalendarExpiresAt
    return safe
  }

  private async createRefreshToken(userId: string, ip?: string, userAgent?: string): Promise<string> {
    const rawToken = randomBytes(40).toString('hex')
    const rt = this.rtRepo.create({
      tokenHash: hashToken(rawToken),
      userId,
      ipAddress: ip,
      userAgent: userAgent?.slice(0, 200),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })
    try {
      await this.rtRepo.save(rt)
    } catch (err: any) {
      this.logger.error(`createRefreshToken falhou: ${err?.message ?? err}`)
      throw err
    }
    return rawToken
  }

  // ── Rate limiting por email ────────────────────────────────────────────────

  private async checkLoginRateLimit(email: string, ip?: string): Promise<void> {
    const now = new Date()
    const entry = await this.loginAttempts.findOneBy({ email })
    if (!entry) return
    if (now > entry.resetAt) {
      await this.loginAttempts.delete({ email })
      return
    }
    if (entry.count >= this.MAX_ATTEMPTS) {
      const retryAfter = Math.ceil((entry.resetAt.getTime() - now.getTime()) / 1000)
      this.audit('LOGIN_RATE_LIMITED', { email: this.maskEmail(email), ip, retryAfter: String(retryAfter) })
      throw new HttpException(
        { message: 'Muitas tentativas. Tente novamente em alguns minutos.', retryAfter },
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }
  }

  private async recordLoginFailure(email: string): Promise<void> {
    const now = new Date()
    const resetAt = new Date(now.getTime() + this.WINDOW_MS)

    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(LoginAttempt)
      const entry = await repo.findOne({ where: { email } })
      if (!entry || now > entry.resetAt) {
        await repo.save(repo.create({ email, count: 1, resetAt }))
        return
      }
      entry.count += 1
      await repo.save(entry)
    })
  }

  private async clearLoginAttempts(email: string): Promise<void> {
    await this.loginAttempts.delete({ email })
  }

  // ── Audit log ─────────────────────────────────────────────────────────────

  private audit(event: string, ctx: Record<string, string | undefined> = {}): void {
    this.auditLogger.log(`[${event}] ${JSON.stringify(ctx)}`)
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@')
    if (!domain) return '***'
    return `${local.slice(0, 2)}***@${domain}`
  }
}