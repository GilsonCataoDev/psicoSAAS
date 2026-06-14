import {
  BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Patch, Post, Query, Request, Response, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Throttle, SkipThrottle } from '@nestjs/throttler'
import type { CookieOptions, Request as Req, Response as Res } from 'express'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { CsrfGuard }    from './guards/csrf.guard'
import { RegisterDto }          from './dto/register.dto'
import { LoginDto }             from './dto/login.dto'
import { UpdateProfileDto }     from './dto/update-profile.dto'
import { UpdatePreferencesDto } from './dto/update-preferences.dto'
import { UpdateOnboardingDto }  from './dto/update-onboarding.dto'
import { ChangePasswordDto }    from './dto/change-password.dto'
import { ForgotPasswordDto }    from './dto/forgot-password.dto'
import { ResetPasswordDto }     from './dto/reset-password.dto'
import { DeleteAccountDto }     from './dto/delete-account.dto'

// ── Cookie helpers ────────────────────────────────────────────────────────────

const ACCESS_COOKIE  = 'usecognia_token'
const REFRESH_COOKIE = 'usecognia_refresh'
const LEGACY_ACCESS_COOKIE  = 'psicosaas_token'
const LEGACY_REFRESH_COOKIE = 'psicosaas_refresh'

/** Flags de cookie variam por ambiente para suportar dev (HTTP) e prod (HTTPS cross-origin) */
function cookieBase(): Pick<CookieOptions, 'httpOnly' | 'secure' | 'sameSite' | 'path' | 'priority' | 'partitioned'> {
  const isProd = process.env.NODE_ENV === 'production'
  const usePartitionedCookie = process.env.COOKIE_PARTITIONED === 'true'
  return {
    httpOnly: true,
    secure:   isProd,
    sameSite: isProd ? 'none' : 'lax',
    path:     '/',
    priority: 'high',
    ...(isProd && usePartitionedCookie ? { partitioned: true } : {}),
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

function isNativeClient(req: Req): boolean {
  return req.headers['x-usecognia-client'] === 'native'
}

function authResponse(req: Req, result: { user: unknown; csrfToken: string; tokens: { accessToken: string; refreshToken: string } }) {
  return {
    user: result.user,
    csrfToken: result.csrfToken,
    ...(isNativeClient(req) ? { tokens: result.tokens } : {}),
  }
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
    return authResponse(req, result)
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
    return authResponse(req, result)
  }

  // ── Refresh Token ───────────────────────────────────────────────────────────

  /**
   * Rotaciona o refresh token:
   * - Valida o cookie usecognia_refresh
   * - Revoga o token antigo
   * - Emite novo par (access + refresh) + novo csrfToken
   *
   * Limitado a 10/min (usuário legítimo raramente chama isso — acesso suspeito se mais)
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  async refresh(
    @Body() body: { refreshToken?: string },
    @Request() req: Req,
    @Response({ passthrough: true }) res: Res,
  ) {
    const rawToken = req.cookies?.[REFRESH_COOKIE]
      ?? req.cookies?.[LEGACY_REFRESH_COOKIE]
      ?? (isNativeClient(req) ? req.headers['x-refresh-token'] as string | undefined : undefined)
      ?? (isNativeClient(req) ? body?.refreshToken : undefined)
    const result   = await this.auth.refresh(rawToken, getIp(req), req.headers['user-agent'])
    this.setAuthCookies(res, result.tokens)
    return authResponse(req, result)
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
    this.clearAuthCookies(res)
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

  @Post('avatar')
  @UseGuards(JwtAuthGuard, CsrfGuard)
  @UseInterceptors(FileInterceptor('avatar', { limits: { fileSize: 1024 * 1024 } }))
  uploadAvatar(@Request() req: any, @UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Envie uma imagem JPG')
    if (!['image/jpeg', 'image/jpg'].includes(file.mimetype)) {
      throw new BadRequestException('A foto precisa ser um arquivo JPG')
    }
    return this.auth.updateAvatar(req.user.id, file.buffer)
  }

  @Patch('preferences')
  @UseGuards(JwtAuthGuard, CsrfGuard)
  @SkipThrottle()
  updatePreferences(@Request() req: any, @Body() dto: UpdatePreferencesDto) {
    return this.auth.updatePreferences(req.user.id, dto)
  }

  @Patch('onboarding')
  @UseGuards(JwtAuthGuard, CsrfGuard)
  @SkipThrottle()
  updateOnboarding(@Request() req: any, @Body() dto: UpdateOnboardingDto) {
    return this.auth.updateOnboarding(req.user.id, dto)
  }

  @Patch('password')
  @UseGuards(JwtAuthGuard, CsrfGuard)
  changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(req.user.id, dto.currentPassword, dto.newPassword)
  }

  @Delete('account')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, CsrfGuard)
  async deleteAccount(
    @Request() req: any,
    @Body() dto: DeleteAccountDto,
    @Response({ passthrough: true }) res: Res,
  ) {
    await this.auth.deleteAccount(req.user.id, dto.password, getIp(req))
    this.clearAuthCookies(res)
    return { deleted: true }
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

  @Get('verify-email')
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  verifyEmail(@Query('token') token: string) {
    return this.auth.verifyEmail(token)
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, CsrfGuard)
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  resendVerification(@Request() req: any) {
    return this.auth.resendEmailVerification(req.user.id)
  }

  private setAuthCookies(res: Res, tokens: { accessToken: string; refreshToken: string }): void {
    this.clearLegacyAuthCookies(res)
    res.cookie(ACCESS_COOKIE,  tokens.accessToken,  accessCookieOpts())
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOpts())
  }

  private clearAuthCookies(res: Res): void {
    res.clearCookie(ACCESS_COOKIE, clearAccessOpts())
    res.clearCookie(REFRESH_COOKIE, clearRefreshOpts())
    this.clearLegacyAuthCookies(res)
  }

  private clearLegacyAuthCookies(res: Res): void {
    res.clearCookie(LEGACY_ACCESS_COOKIE, clearAccessOpts())
    res.clearCookie(LEGACY_REFRESH_COOKIE, clearRefreshOpts())
  }
}
