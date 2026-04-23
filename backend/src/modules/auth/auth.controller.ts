import {
  Body, Controller, Get, Post, UseGuards,
  Request, Response, HttpCode, HttpStatus,
} from '@nestjs/common'
import { Throttle, SkipThrottle } from '@nestjs/throttler'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import type { Response as Res } from 'express'

const COOKIE_NAME = 'psicosaas_token'
const COOKIE_OPTS = {
  httpOnly: true,                                    // JS não acessa
  secure: process.env.NODE_ENV === 'production',     // HTTPS em produção
  sameSite: 'strict' as const,                       // proteção CSRF
  maxAge: 7 * 24 * 60 * 60 * 1000,                  // 7 dias
  path: '/',
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  /** Cadastro — limitado a 3 por minuto por IP */
  @Post('register')
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  async register(
    @Body() dto: RegisterDto,
    @Response({ passthrough: true }) res: Res,
  ) {
    const { user, token } = await this.auth.register(dto)
    res.cookie(COOKIE_NAME, token, COOKIE_OPTS)
    return { user } // token NUNCA vai no body
  }

  /** Login — limitado a 5 tentativas por minuto por IP */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  async login(
    @Body() dto: LoginDto,
    @Response({ passthrough: true }) res: Res,
  ) {
    const { user, token } = await this.auth.login(dto)
    res.cookie(COOKIE_NAME, token, COOKIE_OPTS)
    return { user }
  }

  /** Logout — apaga o cookie */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  logout(@Response({ passthrough: true }) res: Res) {
    res.clearCookie(COOKIE_NAME, { path: '/' })
    return { message: 'Sessão encerrada com segurança 🔒' }
  }

  /** Perfil do usuário autenticado */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  me(@Request() req: any) {
    const { passwordHash: _, ...user } = req.user
    return user
  }
}
