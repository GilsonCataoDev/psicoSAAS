import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'

export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? 'gilsonfilho96@outlook.com')
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
