import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'

/**
 * Bloqueia ações sensíveis (senha, exclusão de conta, perfil, billing) enquanto
 * um admin está em modo "ver como" (impersonation). Depende de req.user.impersonatedBy,
 * setado pelo JwtStrategy quando o access token carrega essa claim.
 */
@Injectable()
export class NoImpersonationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest()
    if (req.user?.impersonatedBy) {
      throw new ForbiddenException('Ação bloqueada durante visualização como outro usuário')
    }
    return true
  }
}
