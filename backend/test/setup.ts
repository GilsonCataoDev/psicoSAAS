import { Test } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { getRepositoryToken } from '@nestjs/typeorm'
import * as cookieParser from 'cookie-parser'
import { AppModule } from '../src/app.module'
import { User } from '../src/modules/auth/entities/user.entity'
import { hashPassword } from '../src/common/password/password.util'
import { userFactory } from './factories/user.factory'
import { EmailService } from '../src/modules/email/email.service'

/**
 * EmailService.deliver() lança ServiceUnavailableException quando
 * RESEND_API_KEY não está configurado (não há um valor "dummy" seguro pra
 * essa env — dispararia uma chamada de rede de verdade). Sem esse stub,
 * qualquer fluxo que aguarda o envio de e-mail (ex.: confirmação de
 * booking) falha em teste mesmo quando a lógica de negócio sob teste está
 * correta. Nenhum teste de integração aqui verifica conteúdo de e-mail.
 */
const emailServiceStub = new Proxy({}, {
  get: (_target, prop) => {
    // Crítico: NÃO responder a 'then' como se fosse um método real. Um Proxy
    // que devolve uma função para QUALQUER prop, incluindo 'then', vira um
    // "thenable" aos olhos do V8 — o primeiro `await`/`Promise.resolve()`
    // sobre esse valor (em qualquer lugar do bootstrap do Nest) trava para
    // sempre, porque a Promise nunca chama resolve/reject de verdade.
    if (prop === 'then') return undefined
    if (prop === 'isRateLimited') return () => false
    if (prop === 'getRateLimitRetryAfterMs') return () => 0
    return async () => undefined
  },
})

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(EmailService).useValue(emailServiceStub)
    .compile()

  const app = moduleRef.createNestApplication()
  app.use(cookieParser())
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    stopAtFirstError: false,
  }))
  app.setGlobalPrefix('api')
  await app.init()
  return app
}

/** Cria e persiste um usuário válido com senha hashada (Argon2id, mesmo util usado em produção). */
export async function createTestUser(
  app: INestApplication,
  overrides: Partial<{ email: string; password: string; name: string; isActive: boolean; emailVerified: boolean }> = {},
): Promise<{ user: User; password: string }> {
  const password = overrides.password ?? 'Senha!Forte123'
  const passwordHash = await hashPassword(password)
  const repo = app.get<import('typeorm').Repository<User>>(getRepositoryToken(User))

  const user = await repo.save(repo.create(userFactory({ ...overrides, passwordHash })))
  return { user, password }
}
