import {
  Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { User } from './entities/user.entity'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { EmailService } from '../email/email.service'

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    private jwt: JwtService,
    private email: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.users.findOneBy({ email: dto.email.toLowerCase() })
    if (exists) throw new ConflictException('E-mail já cadastrado')

    const passwordHash = await bcrypt.hash(dto.password, 12)
    const user = this.users.create({
      ...dto,
      email: dto.email.toLowerCase(),
      passwordHash,
    })
    await this.users.save(user)
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
