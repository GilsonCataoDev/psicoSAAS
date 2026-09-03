import 'reflect-metadata'
import { ForbiddenException } from '@nestjs/common'
import { ProspectingController } from './prospecting.controller'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { AdminGuard } from '../../common/guards/admin.guard'

// Chave interna do Nest para os guards aplicados via @UseGuards — usada aqui
// só para confirmar que o controller declara os guards esperados.
const GUARDS_METADATA_KEY = '__guards__'

describe('ProspectingController — autorização', () => {
  it('está protegido por JwtAuthGuard e AdminGuard', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA_KEY, ProspectingController) as unknown[]
    expect(guards).toContain(JwtAuthGuard)
    expect(guards).toContain(CsrfGuard)
    expect(guards).toContain(AdminGuard)
  })
})

describe('AdminGuard — usado por todas as rotas de /admin/prospecting', () => {
  const originalEnv = process.env.ADMIN_EMAILS

  afterEach(() => {
    process.env.ADMIN_EMAILS = originalEnv
  })

  function contextWithEmail(email?: string) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user: email ? { email } : undefined }),
      }),
    } as any
  }

  it('bloqueia usuário autenticado que não está na allowlist de admins', () => {
    process.env.ADMIN_EMAILS = 'admin@usecognia.com.br'
    const guard = new AdminGuard()
    expect(() => guard.canActivate(contextWithEmail('psicologa@exemplo.com'))).toThrow(ForbiddenException)
  })

  it('bloqueia requisição sem usuário autenticado', () => {
    process.env.ADMIN_EMAILS = 'admin@usecognia.com.br'
    const guard = new AdminGuard()
    expect(() => guard.canActivate(contextWithEmail(undefined))).toThrow(ForbiddenException)
  })

  it('permite acesso para e-mail presente em ADMIN_EMAILS', () => {
    process.env.ADMIN_EMAILS = 'admin@usecognia.com.br'
    const guard = new AdminGuard()
    expect(guard.canActivate(contextWithEmail('admin@usecognia.com.br'))).toBe(true)
  })
})
