import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { timingSafeEqual } from 'crypto'
import { Request } from 'express'
import { generateCsrfToken } from '../../../common/crypto/encrypt.util'

/**
 * Valida o CSRF token em requisições de mutação (POST, PATCH, PUT, DELETE).
 *
 * Padrão: Synchronizer Token stateless
 * - O token é HMAC-SHA256(JWT_SECRET, "csrf:" + userId) — determinístico, sem DB.
 * - Retornado no body de /auth/login, /auth/register e /auth/me.
 * - Frontend armazena em memória (Zustand não-persistido) e envia via X-CSRF-Token.
 * - Atacante externo não pode forjar sem conhecer o JWT_SECRET.
 *
 * IMPORTANTE: este guard deve sempre ser aplicado APÓS JwtAuthGuard,
 * pois depende de req.user.id estar populado.
 *
 * GET/HEAD/OPTIONS são sempre ignorados — não modificam estado.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { user?: { id: string } }>()

    // Métodos seguros não precisam de CSRF
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true

    const user = req.user
    if (!user?.id) return true  // não autenticado — JwtAuthGuard trata isso

    const header  = req.headers['x-csrf-token'] as string | undefined
    const expected = generateCsrfToken(user.id)

    if (!header) throw new ForbiddenException('CSRF token ausente')

    // timingSafeEqual previne timing attacks na comparação
    try {
      const hBuf = Buffer.from(header,   'hex')
      const eBuf = Buffer.from(expected, 'hex')
      if (hBuf.length !== eBuf.length || !timingSafeEqual(hBuf, eBuf)) {
        throw new ForbiddenException('CSRF token inválido')
      }
    } catch {
      throw new ForbiddenException('CSRF token inválido')
    }

    return true
  }
}
