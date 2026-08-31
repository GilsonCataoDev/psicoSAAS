import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'

export function getAdminEmails(): string[] {
  // Sem fallback hardcoded: se ADMIN_EMAILS não estiver configurada, ninguém
  // é admin (fail-closed). Em produção, main.ts recusa o boot sem essa env var.
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
}

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest()
    if (!req.user?.email || !getAdminEmails().includes(req.user.email.toLowerCase())) {
      throw new ForbiddenException('Acesso restrito')
    }
    return true
  }
}
