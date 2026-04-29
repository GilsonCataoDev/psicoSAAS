import {
  Body, Controller, Get, Post, Patch, UseGuards,
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
  httpOnly: true,
  secure: true,           // sempre HTTPS (obrigatório para SameSite=none)
  sameSite: 'none' as const, // permite cookie cross-origin (GitHub Pages → Railway)
  maxAge: 7 * 24 * 60 * 60 * 1000,
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

  /** Atualiza nome, CRP, especialidade e telefone */
  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  updateProfile(
    @Request() req: any,
    @Body() body: { name?: string; crp?: string; specialty?: string; phone?: string },
  ) {
    return this.auth.updateProfile(req.user.id, body)
  }

  /** Atualiza preferências (notificações, PIX, mensagens, etc.) */
  @Patch('preferences')
  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  updatePreferences(
    @Request() req: any,
    @Body() body: Record<string, unknown>,
  ) {
    return this.auth.updatePreferences(req.user.id, body)
  }

  /** Troca de senha (autenticado) */
  @Patch('password')
  @UseGuards(JwtAuthGuard)
  changePassword(
    @Request() req: any,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.auth.changePassword(req.user.id, body.currentPassword, body.newPassword)
  }

  /**
   * Esqueci a senha — envia e-mail com link de recuperação.
   * Limitado a 3 tentativas/min por IP para evitar spam.
   * Sempre retorna 200 (não revela se o e-mail existe).
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  async forgotPassword(@Body('email') email: string) {
    if (!email) return { message: 'Se este e-mail estiver cadastrado, você receberá as instruções.' }
    await this.auth.forgotPassword(email)
    return { message: 'Se este e-mail estiver cadastrado, você receberá as instruções em breve.' }
  }

  /**
   * Redefine a senha com o token recebido por e-mail.
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  async resetPassword(@Body() body: { token: string; password: string }) {
    await this.auth.resetPassword(body.token, body.password)
    return { message: 'Senha redefinida com sucesso. Faça login para continuar.' }
  }
}
