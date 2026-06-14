import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { Request } from 'express'
import { AuthService } from '../auth.service'
import { getAdminEmails } from '../../../common/guards/admin.guard'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(cfg: ConfigService, private auth: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.['usecognia_token'] ?? req?.cookies?.['psicosaas_token'] ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: cfg.get<string>('JWT_SECRET'),
      passReqToCallback: false,
    })
  }

  async validate(payload: { sub: string; email: string }) {
    const user = await this.auth.findById(payload.sub)
    if (!user) throw new UnauthorizedException('Sessão inválida')
    const {
      passwordHash: _passwordHash,
      resetPasswordToken: _resetPasswordToken,
      resetPasswordExpiry: _resetPasswordExpiry,
      emailVerificationToken: _emailVerificationToken,
      emailVerificationExpiry: _emailVerificationExpiry,
      ...safe
    } = user as any
    if (safe.preferences) {
      safe.preferences = this.cleanPreferences(safe.preferences)
    }
    safe.isAdmin = getAdminEmails().includes((safe.email ?? '').toLowerCase())
    return safe
  }

  private cleanPreferences(preferences: Record<string, unknown>): Record<string, unknown> {
    const safe = { ...preferences }
    delete safe.asaasApiKey
    delete safe.googleCalendarAccessToken
    delete safe.googleCalendarRefreshToken
    delete safe.googleCalendarExpiresAt
    return safe
  }
}
