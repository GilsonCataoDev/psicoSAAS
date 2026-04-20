import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { User } from './entities/user.entity'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.users.findOneBy({ email: dto.email })
    if (exists) throw new ConflictException('E-mail já cadastrado')

    const passwordHash = await bcrypt.hash(dto.password, 12)
    const user = this.users.create({ ...dto, passwordHash })
    await this.users.save(user)

    return this.buildResponse(user)
  }

  async login(dto: LoginDto) {
    const user = await this.users.findOneBy({ email: dto.email })
    if (!user) throw new UnauthorizedException('Credenciais inválidas')

    const valid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!valid) throw new UnauthorizedException('Credenciais inválidas')

    return this.buildResponse(user)
  }

  async findById(id: string) {
    return this.users.findOneBy({ id })
  }

  private buildResponse(user: User) {
    const token = this.jwt.sign({ sub: user.id, email: user.email })
    const { passwordHash: _, ...profile } = user
    return { user: profile, token }
  }
}
