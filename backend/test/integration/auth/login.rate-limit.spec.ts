import { HttpException, HttpStatus, INestApplication } from '@nestjs/common'
import { createTestApp } from '../../setup'
import { AuthService } from '../../../src/modules/auth/auth.service'

describe('AuthService.login — rate limit por e-mail (10 tentativas / 15min)', () => {
  let app: INestApplication
  let authService: AuthService

  beforeAll(async () => {
    app = await createTestApp()
    authService = app.get(AuthService)
  })

  afterAll(async () => {
    if (app) await app.close()
  })

  it('bloqueia com 429 e retryAfter após 10 tentativas com senha errada', async () => {
    // Invocado direto no AuthService (não via HTTP/supertest): a rota real
    // também está sob um ThrottlerGuard global (@Throttle 5 req/60s por IP),
    // que bloquearia na 6ª chamada antes do limite de 10 tentativas por
    // e-mail (LoginAttempt/DB) — que é a lógica de negócio sob teste aqui —
    // sequer ser alcançado. Overrides de teste (overrideGuard/overrideProvider)
    // não interceptam esse guard porque ele divide o token APP_GUARD com
    // outros dois guards (Subscription/Plan) registrados no mesmo módulo.
    const email = 'usuario-inexistente@example.com'

    for (let i = 0; i < 10; i++) {
      await expect(authService.login({ email, password: 'senha-errada' } as any))
        .rejects.toThrow('Credenciais inválidas')
    }

    try {
      await authService.login({ email, password: 'senha-errada' } as any)
      throw new Error('esperava que a 11a tentativa lançasse 429')
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException)
      const httpErr = err as HttpException
      expect(httpErr.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS)
      const response = httpErr.getResponse() as { retryAfter?: number }
      expect(response.retryAfter).toBeGreaterThan(0)
    }
  })
})
