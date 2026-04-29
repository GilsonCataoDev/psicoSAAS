import {
  Body, Controller, Get, HttpCode, HttpStatus,
  Patch, Post, Request, Response, UseGuards,
} from '@nestjs/common'
import { Throttle, SkipThrottle } from '@nestjs/throttler'
import type { CookieOptions, Request as Req, Response as Res } from 'express'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { CsrfGuard }    from './guards/csrf.guard'
import { RegisterDto }          from './dto/register.dto'
import { LoginDto }             from './dto/login.dto'
import { UpdateProfileDto }     from './dto/update-profile.dto'
import { UpdatePreferencesDto } from './dto/update-preferences.dto'
import { ChangePasswordDto }    from './dto/change-password.dto'
import { ForgotPasswordDto }    from './dto/forgot-password.dto'
import { ResetPasswordDto }     from './dto/reset-password.dto'

// ── Cookie helpers ────────────────────────────────────────────────────────────

const ACCESS_COOKIE  = 'psicosaas_token'
const REFRESH_COOKIE = 'psicosaas_refresh'

/** Flags de cookie variam por ambiente para suportar dev (HTTP) e prod (HTTPS cross-origin) */
function cookieBase(): Pick<CookieOptions, 'httpOnly' | 'secure' | 'sameSite' | 'path'> {
  const isProd = process.env.NODE_ENV === 'production'
  return {
    httpOnly: true,
    secure:   isProd,
    sameSite: isProd ? 'none' : 'lax',
    path:     '/',
  }
}

function accessCookieOpts(): CookieOptions {
  return { ...cookieBase(), maxAge: 15 * 60 * 1000 }  // 15 minutos
}

function refreshCookieOpts(): CookieOptions {
  return {
    ...cookieBase(),
    maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 dias
    path:   '/api/auth',               // minimiza exposição: só vai para /api/auth/*
  }
}

function clearAccessOpts(): CookieOptions  { return cookieBase() }
function clearRefreshOpts(): CookieOptions { return { ...cookieBase(), path: '/api/auth' } }

/** Extrai IP real do request, considerando proxies (Railway usa X-Forwarded-For) */
function getIp(req: Req): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    ?? req.socket.remoteAddress
    ?? 'unknown'
}

// ── Controller ────────────────────────────────────────────────────────────────

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // ── Cadastro ────────────────────────────────────────────────────────────────

  @Post('register')
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  async register(
    @Body() dto: RegisterDto,
    @Request() req: Req,
    @Response({ passthrough: true }) res: Res,
  ) {
    const result = await this.auth.register(dto, getIp(req), req.headers['user-agent'])
    this.setAuthCookies(res, result.tokens)
    return { user: result.user, csrfToken: result.csrfToken }
  }

  // ── Login ───────────────────────────────────────────────────────────────────

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  async login(
    @Body() dto: LoginDto,
    @Request() req: Req,
    @Response({ passthrough: true }) res: Res,
  ) {
    const result = await this.auth.login(dto, getIp(req), req.headers['user-agent'])
    this.setAuthCookies(res, result.tokens)
    return { user: result.user, csrfToken: result.csrfToken }
  }

  // ── Refresh Token ───────────────────────────────────────────────────────────

  /**
   * Rotaciona o refresh token:
   * - Valida o cookie psicosaas_refresh
   * - Revoga o token antigo
   * - Emite novo par (access + refresh) + novo csrfToken
   *
   * Limitado a 10/min (usuário legítimo raramente chama isso — acesso suspeito se mais)
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  async refresh(
    @Request() req: Req,
    @Response({ passthrough: true }) res: Res,
  ) {
    const rawToken = req.cookies?.[REFRESH_COOKIE]
    const result   = await this.auth.refresh(rawToken, getIp(req), req.headers['user-agent'])
    this.setAuthCookies(res, result.tokens)
    return { user: result.user, csrfToken: result.csrfToken }
  }

  // ── Logout ─────────────────────────────────────────────────────────────────

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, CsrfGuard)
  async logout(
    @Request() req: any,
    @Response({ passthrough: true }) res: Res,
  ) {
    await this.auth.revokeAllTokens(req.user.id, getIp(req))
    res.clearCookie(ACCESS_COOKIE,  clearAccessOpts())
    res.clearCookie(REFRESH_COOKIE, clearRefreshOpts())
    return { message: 'Sessão encerrada com segurança 🔒' }
  }

  // ── Perfil autenticado ──────────────────────────────────────────────────────

  /**
   * Retorna o perfil + csrfToken.
   * Chamado no boot do app — garante que o csrfToken seja restaurado após page refresh.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  me(@Request() req: any) {
    return {
      ...req.user,
      csrfToken: this.auth.generateCsrfToken(req.user.id),
    }
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard, CsrfGuard)
  @SkipThrottle()
  updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(req.user.id, dto)
  }

  @Patch('preferences')
  @UseGuards(JwtAuthGuard, CsrfGuard)
  @SkipThrottle()
  updatePreferences(@Request() req: any, @Body() dto: UpdatePreferencesDto) {
    return this.auth.updatePreferences(req.user.id, dto)
  }

  @Patch('password')
  @UseGuards(JwtAuthGuard, CsrfGuard)
  changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(req.user.id, dto.currentPassword, dto.newPassword)
  }

  // ── Recuperação de senha ────────────────────────────────────────────────────

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

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private setAuthCookies(res: Res, tokens: { accessToken: string; refreshToken: string }): void {
    res.cookie(ACCESS_COOKIE,  tokens.accessToken,  accessCookieOpts())
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOpts())
  }
}
