import {
  BadRequestException, ConflictException, HttpException, HttpStatus,
  Injectable, Logger, NotFoundException, UnauthorizedException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { generateCsrfToken, hashToken } from '../../common/crypto/encrypt.util'
import { User }         from './entities/user.entity'
import { RefreshToken } from './entities/refresh-token.entity'
import { RegisterDto }          from './dto/register.dto'
import { LoginDto }             from './dto/login.dto'
import { UpdateProfileDto }     from './dto/update-profile.dto'
import { UpdatePreferencesDto } from './dto/update-preferences.dto'
import { EmailService }   from '../email/email.service'
import { ReferralService } from '../referral/referral.service'

// ── Tipagem de retorno ─────────────────────────────────────────────────────────
export interface AuthTokens {
  accessToken:  string
  refreshToken: string
}

export interface SafeUser extends Omit<User, 'passwordHash' | 'resetPasswordToken' | 'resetPasswordExpiry'> {}

export interface AuthResult {
  user:      SafeUser
  tokens:    AuthTokens
  csrfToken: string
}

// ── Rate limiting por email (brute-force por usuário) ─────────────────────────
interface LoginAttemptEntry {
  count:    number
  resetAt:  number
}

@Injectable()
export class AuthService {
  private readonly logger     = new Logger(AuthService.name)
  private readonly auditLogger = new Logger('AuditLog')

  /** Brute-force protection: max 10 falhas por email em 15 minutos */
  private readonly loginAttempts = new Map<string, LoginAttemptEntry>()
  private readonly MAX_ATTEMPTS  = 10
  private readonly WINDOW_MS     = 15 * 60 * 1000

  constructor(
    @InjectRepository(User)         private users:    Repository<User>,
    @InjectRepository(RefreshToken) private rtRepo:   Repository<RefreshToken>,
    private jwt:      JwtService,
    private email:    EmailService,
    private referral: ReferralService,
  ) {}

  // ── Registro ───────────────────────────────────────────────────────────────

  async register(dto: RegisterDto, ip?: string, userAgent?: string): Promise<AuthResult> {
    const exists = await this.users.findOneBy({ email: dto.email.toLowerCase() })
    if (exists) throw new ConflictException('E-mail já cadastrado')

    const { referralCode, ...userData } = dto
    const passwordHash = await bcrypt.hash(userData.password, 12)
    const user = this.users.create({ ...userData, email: userData.email.toLowerCase(), passwordHash })
    await this.users.save(user)

    if (referralCode) {
      this.referral.applyReferral(referralCode, user).catch(() => {})
    }

    this.email.sendWelcome(user.name, user.email).catch(() => {})
    this.audit('REGISTER', { userId: user.id, ip })

    return this.buildResult(user, ip, userAgent)
  }

  // ── Login ──────────────────────────────────────────────────────────────────

  async login(dto: LoginDto, ip?: string, userAgent?: string): Promise<AuthResult> {
    const email = dto.email.toLowerCase()

    // Rate limit por email antes de qualquer operação
    this.checkLoginRateLimit(email, ip)

    const user = await this.users.findOneBy({ email })

    // Tempo constante mesmo se user não existe (previne timing attack)
    const dummyHash = '$2a$12$dummyhashtopreventtimingattack000000000000000000000000'
    const hash  = user?.passwordHash ?? dummyHash
    const valid = await bcrypt.compare(dto.password, hash)

    if (!user || !valid) {
      this.recordLoginFailure(email)
      this.audit('LOGIN_FAILED', { email: this.maskEmail(email), ip })
      throw new UnauthorizedException('Credenciais inválidas')
    }

    this.clearLoginAttempts(email)
    this.audit('LOGIN_SUCCESS', { userId: user.id, ip })

    return this.buildResult(user, ip, userAgent)
  }

  // ── Refresh Token ──────────────────────────────────────────────────────────

  /**
   * Rotaciona o refresh token:
   * 1. Valida o token bruto recebido do cookie
   * 2. Detecta replay attack (token revogado → invalida toda a sessão)
   * 3. Revoga o token atual e cria um novo par (access + refresh)
   */
  async refresh(rawToken: string, ip?: string, userAgent?: string): Promise<AuthResult> {
    if (!rawToken) throw new UnauthorizedException('Refresh token ausente')

    const tokenHash = hashToken(rawToken)
    const rt = await this.rtRepo
      .createQueryBuilder('rt')
      .addSelect('rt.tokenHash')
      .where('rt.tokenHash = :tokenHash', { tokenHash })
      .getOne()

    if (!rt) {
      throw new UnauthorizedException('Sessão inválida. Faça login novamente.')
    }

    // ── Replay attack detection ──────────────────────────────────────────────
    if (rt.revoked) {
      // Token revogado sendo reutilizado → sessão provavelmente comprometida
      await this.rtRepo.update({ userId: rt.userId }, { revoked: true })
      this.audit('REFRESH_REPLAY_DETECTED', { userId: rt.userId, ip })
      throw new UnauthorizedException('Sessão comprometida. Faça login novamente.')
    }

    if (new Date() > rt.expiresAt) {
      throw new UnauthorizedException('Sessão expirada. Faça login novamente.')
    }

    // Revoga token antigo (soft delete para audit)
    await this.rtRepo.update(rt.id, { revoked: true })

    const user = await this.users.findOneBy({ id: rt.userId })
    if (!user) throw new UnauthorizedException('Usuário não encontrado')

    this.audit('REFRESH_TOKEN_ROTATED', { userId: user.id, ip })

    return this.buildResult(user, ip, userAgent)
  }

  /**
   * Revoga todos os refresh tokens do usuário (logout completo).
   * Garante que nenhuma sessão paralela permaneça ativa.
   */
  async revokeAllTokens(userId: string, ip?: string): Promise<void> {
    await this.rtRepo.update({ userId, revoked: false }, { revoked: true })
    this.audit('LOGOUT', { userId, ip })
  }

  // ── Perfil ─────────────────────────────────────────────────────────────────

  async findById(id: string): Promise<User | null> {
    return this.users.findOneBy({ id })
  }

  async updateProfile(id: string, data: UpdateProfileDto): Promise<SafeUser> {
    const user = await this.users.findOneBy({ id })
    if (!user) throw new NotFoundException()
    Object.assign(user, data)
    await this.users.save(user)
    const { passwordHash: _, resetPasswordToken: __, resetPasswordExpiry: ___, ...profile } = user
    return profile as SafeUser
  }

  async updatePreferences(id: string, preferences: UpdatePreferencesDto): Promise<Record<string, unknown>> {
    const user = await this.users.findOneBy({ id })
    if (!user) throw new NotFoundException()
    user.preferences = { ...(user.preferences ?? {}), ...preferences }
    await this.users.save(user)
    return user.preferences!
  }

  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.users.findOneBy({ id })
    if (!user) throw new NotFoundException()
    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    // Mensagem genérica — não diferencia "senha errada" de "conta inexistente"
    if (!valid) throw new UnauthorizedException('Credenciais inválidas')
    user.passwordHash = await bcrypt.hash(newPassword, 12)
    await this.users.save(user)
    this.audit('PASSWORD_CHANGED', { userId: id })
    return { message: 'Senha alterada com sucesso' }
  }

  // ── Recuperação de senha ───────────────────────────────────────────────────

  async forgotPassword(email: string): Promise<void> {
    const user = await this.users.findOneBy({ email: email.toLowerCase().trim() })
    if (!user) return   // resposta idêntica para evitar user enumeration

    const token = randomBytes(32).toString('hex')
    user.resetPasswordToken  = hashToken(token)
    user.resetPasswordExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000)
    await this.users.save(user)

    this.email.sendPasswordReset(user.name, user.email, token).catch(() => {})
    this.audit('PASSWORD_RESET_REQUESTED', { email: this.maskEmail(email) })
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    if (!token || !newPassword) throw new BadRequestException('Dados inválidos')
    if (newPassword.length < 8) throw new BadRequestException('A senha deve ter pelo menos 8 caracteres')

    const user = await this.users.findOneBy({ resetPasswordToken: hashToken(token) })
    if (!user || !user.resetPasswordExpiry || user.resetPasswordExpiry < new Date()) {
      throw new BadRequestException('Link inválido ou expirado. Solicite um novo.')
    }

    user.passwordHash        = await bcrypt.hash(newPassword, 12)
    user.resetPasswordToken  = undefined
    user.resetPasswordExpiry = undefined
    await this.users.save(user)

    // Revoga todas as sessões após reset de senha
    await this.rtRepo.update({ userId: user.id }, { revoked: true })
    this.audit('PASSWORD_RESET_SUCCESS', { userId: user.id })
  }

  // ── CSRF ───────────────────────────────────────────────────────────────────

  /** Token stateless — HMAC(JWT_SECRET, "csrf:" + userId) */
  generateCsrfToken(userId: string): string {
    return generateCsrfToken(userId)
  }

  // ── Internos ───────────────────────────────────────────────────────────────

  /**
   * Monta o resultado completo de autenticação:
   * - Access token JWT de curta duração (15 min)
   * - Refresh token opaco, armazenado hashed no DB (7 dias)
   * - CSRF token stateless derivado do userId
   */
  private async buildResult(
    user: User,
    ip?: string,
    userAgent?: string,
  ): Promise<AuthResult> {
    const accessToken = this.jwt.sign(
      { sub: user.id, email: user.email },
      { expiresIn: '15m' },
    )

    const refreshToken = await this.createRefreshToken(user.id, ip, userAgent)
    const csrfToken    = generateCsrfToken(user.id)

    const { passwordHash: _, resetPasswordToken: __, resetPasswordExpiry: ___, ...safeUser } = user

    return { user: safeUser as SafeUser, tokens: { accessToken, refreshToken }, csrfToken }
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
      // Causa mais comum: tabela refresh_tokens não existe (synchronize: false em prod)
      // Solução: adicionar TYPEORM_SYNC=true no Railway e reimplantar uma vez
      this.logger.error(`createRefreshToken falhou: ${err?.message ?? err}`)
      throw err
    }
    return rawToken
  }

  // ── Rate limiting por email ────────────────────────────────────────────────

  private checkLoginRateLimit(email: string, ip?: string): void {
    const now   = Date.now()
    const entry = this.loginAttempts.get(email)
    if (!entry) return
    if (now > entry.resetAt) { this.loginAttempts.delete(email); return }
    if (entry.count >= this.MAX_ATTEMPTS) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
      this.audit('LOGIN_RATE_LIMITED', { email: this.maskEmail(email), ip, retryAfter: String(retryAfter) })
      throw new HttpException(
        { message: 'Muitas tentativas. Tente novamente em alguns minutos.', retryAfter },
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }
  }

  private recordLoginFailure(email: string): void {
    const now   = Date.now()
    const entry = this.loginAttempts.get(email)
    if (!entry || now > entry.resetAt) {
      this.loginAttempts.set(email, { count: 1, resetAt: now + this.WINDOW_MS })
    } else {
      entry.count++
    }
  }

  private clearLoginAttempts(email: string): void {
    this.loginAttempts.delete(email)
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
