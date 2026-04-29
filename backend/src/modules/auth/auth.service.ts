import {
  Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { User } from './entities/user.entity'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { EmailService } from '../email/email.service'
import { ReferralService } from '../referral/referral.service'

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    private jwt: JwtService,
    private email: EmailService,
    private referral: ReferralService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.users.findOneBy({ email: dto.email.toLowerCase() })
    if (exists) throw new ConflictException('E-mail já cadastrado')

    const { referralCode, ...userData } = dto
    const passwordHash = await bcrypt.hash(userData.password, 12)
    const user = this.users.create({
      ...userData,
      email: userData.email.toLowerCase(),
      passwordHash,
    })
    await this.users.save(user)

    // Aplica código de indicação se veio com ?ref=
    if (referralCode) {
      this.referral.applyReferral(referralCode, user).catch(() => {})
    }

    // Envia e-mail de boas-vindas (não bloqueia o registro)
    this.email.sendWelcome(user.name, user.email).catch(() => {})
    return this.buildResponse(user)
  }

  async login(dto: LoginDto) {
    const user = await this.users.findOneBy({ email: dto.email.toLowerCase() })

    // Tempo constante mesmo se user não existe (evita timing attack)
    const dummyHash = '$2a$12$dummyhashtopreventtimingattack000000000000000000000000'
    const hash = user?.passwordHash ?? dummyHash
    const valid = await bcrypt.compare(dto.password, hash)

    if (!user || !valid) throw new UnauthorizedException('Credenciais inválidas')

    return this.buildResponse(user)
  }

  async findById(id: string) {
    return this.users.findOneBy({ id })
  }

  async updateProfile(id: string, data: { name?: string; crp?: string; specialty?: string; phone?: string }) {
    const user = await this.users.findOneBy({ id })
    if (!user) throw new NotFoundException()
    Object.assign(user, data)
    await this.users.save(user)
    const { passwordHash: _, ...profile } = user
    return profile
  }

  async updatePreferences(id: string, preferences: Record<string, unknown>) {
    const user = await this.users.findOneBy({ id })
    if (!user) throw new NotFoundException()
    user.preferences = { ...(user.preferences ?? {}), ...preferences }
    await this.users.save(user)
    return user.preferences
  }

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    const user = await this.users.findOneBy({ id })
    if (!user) throw new NotFoundException()
    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!valid) throw new BadRequestException('Senha atual incorreta')
    if (newPassword.length < 8) throw new BadRequestException('A nova senha deve ter pelo menos 8 caracteres')
    user.passwordHash = await bcrypt.hash(newPassword, 12)
    await this.users.save(user)
    return { message: 'Senha alterada com sucesso' }
  }

  /**
   * Inicia o fluxo de recuperação: gera token seguro, salva com expiração de 2h
   * e envia e-mail. Sempre retorna sucesso para não vazar se o e-mail existe.
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.users.findOneBy({ email: email.toLowerCase().trim() })
    if (!user) return   // resposta idêntica para evitar user enumeration

    const token = randomBytes(32).toString('hex')
    user.resetPasswordToken = token
    user.resetPasswordExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000) // +2h
    await this.users.save(user)

    this.email.sendPasswordReset(user.name, user.email, token).catch(() => {})
  }

  /**
   * Valida o token e, se válido e não expirado, redefine a senha.
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    if (!token || !newPassword) throw new BadRequestException('Dados inválidos')
    if (newPassword.length < 8) throw new BadRequestException('A senha deve ter pelo menos 8 caracteres')

    const user = await this.users.findOneBy({ resetPasswordToken: token })

    if (!user || !user.resetPasswordExpiry || user.resetPasswordExpiry < new Date()) {
      throw new BadRequestException('Link inválido ou expirado. Solicite um novo.')
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12)
    user.resetPasswordToken = undefined
    user.resetPasswordExpiry = undefined
    await this.users.save(user)
  }

  private buildResponse(user: User) {
    const token = this.jwt.sign(
      { sub: user.id, email: user.email },
      { expiresIn: '7d' },
    )
    const { passwordHash: _, ...profile } = user
    return { user: profile, token }
    // Nota: token é passado ao controller para ser colocado em HttpOnly cookie
    // Nunca deve ser retornado diretamente ao cliente no body da resposta
  }
}
