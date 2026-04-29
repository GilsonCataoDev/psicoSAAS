import {
  Body, Controller, Get, HttpCode, HttpStatus,
  Patch, Post, Request, Response, UseGuards,
} from '@nestjs/common'
import { Throttle, SkipThrottle } from '@nestjs/throttler'
import type { CookieOptions, Response as Res } from 'express'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { RegisterDto }          from './dto/register.dto'
import { LoginDto }             from './dto/login.dto'
import { UpdateProfileDto }     from './dto/update-profile.dto'
import { UpdatePreferencesDto } from './dto/update-preferences.dto'
import { ChangePasswordDto }    from './dto/change-password.dto'
import { ForgotPasswordDto }    from './dto/forgot-password.dto'
import { ResetPasswordDto }     from './dto/reset-password.dto'

const COOKIE_NAME = 'psicosaas_token'

/**
 * Opções do cookie variam por ambiente:
 *   - secure / sameSite='none'  → produção (HTTPS cross-origin obrigatório)
 *   - sem secure / sameSite='lax' → desenvolvimento (HTTP localhost funciona)
 *
 * ATENÇÃO: sameSite='none' exige secure=true — sem isso o navegador rejeita o cookie.
 */
function cookieOptions(): CookieOptions {
  const isProd = process.env.NODE_ENV === 'production'
  return {
    httpOnly: true,
    secure:   isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge:   7 * 24 * 60 * 60 * 1000, // 7 dias em ms
    path:     '/',
  }
}

/**
 * clearCookie precisa das mesmas flags usadas na criação.
 * Sem secure+sameSite corretos, o navegador não reconhece o cookie a apagar
 * e o logout falha silenciosamente em produção (cross-origin).
 */
function clearOptions(): CookieOptions {
  const isProd = process.env.NODE_ENV === 'production'
  return {
    httpOnly: true,
    secure:   isProd,
    sameSite: isProd ? 'none' : 'lax',
    path:     '/',
  }
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // ── Cadastro ──────────────────────────────────────────────────────────────

  /** Limitado a 3 tentativas/min por IP */
  @Post('register')
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  async register(
    @Body() dto: RegisterDto,
    @Response({ passthrough: true }) res: Res,
  ) {
    const { user, token } = await this.auth.register(dto)
    res.cookie(COOKIE_NAME, token, cookieOptions())
    return { user } // token NUNCA vai no body
  }

  // ── Login ─────────────────────────────────────────────────────────────────

  /** Limitado a 5 tentativas/min por IP */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  async login(
    @Body() dto: LoginDto,
    @Response({ passthrough: true }) res: Res,
  ) {
    const { user, token } = await this.auth.login(dto)
    res.cookie(COOKIE_NAME, token, cookieOptions())
    return { user }
  }

  // ── Logout ────────────────────────────────────────────────────────────────

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  logout(@Response({ passthrough: true }) res: Res) {
    // Usa as mesmas flags do cookie original para garantir que o navegador
    // reconheça e apague o cookie em contexto cross-origin (produção).
    res.clearCookie(COOKIE_NAME, clearOptions())
    return { message: 'Sessão encerrada com segurança 🔒' }
  }

  // ── Perfil autenticado ────────────────────────────────────────────────────

  /** JwtStrategy.validate() já remove passwordHash — req.user é seguro */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  me(@Request() req: any) {
    return req.user
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  updateProfile(
    @Request() req: any,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.auth.updateProfile(req.user.id, dto)
  }

  @Patch('preferences')
  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  updatePreferences(
    @Request() req: any,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.auth.updatePreferences(req.user.id, dto)
  }

  @Patch('password')
  @UseGuards(JwtAuthGuard)
  changePassword(
    @Request() req: any,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.auth.changePassword(req.user.id, dto.currentPassword, dto.newPassword)
  }

  // ── Recuperação de senha ──────────────────────────────────────────────────

  /**
   * Sempre retorna 200 — não revela se o e-mail existe (evita user enumeration).
   * Limitado a 3 tentativas/min por IP para mitigar abuso de envio de e-mails.
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.auth.forgotPassword(dto.email)
    return { message: 'Se este e-mail estiver cadastrado, você receberá as instruções em breve.' }
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto.token, dto.password)
    return { message: 'Senha redefinida com sucesso. Faça login para continuar.' }
  }
}
