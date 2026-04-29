import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { Request } from 'express'
import { AuthService } from '../auth.service'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(cfg: ConfigService, private auth: AuthService) {
    super({
      // Autenticação exclusiva via HttpOnly cookie — Bearer desabilitado
      // (elimina vetor de ataque por token vazado em header/log)
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.['psicosaas_token'] ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: cfg.get<string>('JWT_SECRET'),
      passReqToCallback: false,
    })
  }

  async validate(payload: { sub: string; email: string }) {
    const user = await this.auth.findById(payload.sub)
    if (!user) throw new UnauthorizedException('Sessão inválida')
    const { passwordHash: _, ...safe } = user as any
    return safe
  }
}
