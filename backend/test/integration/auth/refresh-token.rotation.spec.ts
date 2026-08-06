import { INestApplication } from '@nestjs/common'
import { createTestApp, createTestUser } from '../../setup'
import { AuthService } from '../../../src/modules/auth/auth.service'

describe('AuthService — rotação e reuso de refresh token', () => {
  let app: INestApplication
  let authService: AuthService

  beforeAll(async () => {
    app = await createTestApp()
    authService = app.get(AuthService)
  })

  afterAll(async () => {
    if (app) await app.close()
  })

  it('rotaciona o refresh token e revoga toda a sessão em caso de reuso do token antigo', async () => {
    const { user, password } = await createTestUser(app)

    const loginResult = await authService.login({ email: user.email, password } as any)
    const oldRefreshToken = loginResult.tokens.refreshToken

    const refreshed = await authService.refresh(oldRefreshToken)
    expect(refreshed.tokens.refreshToken).toBeDefined()
    expect(refreshed.tokens.refreshToken).not.toBe(oldRefreshToken)

    // Reuso do token antigo (já rotacionado/revogado) — sinal de possível vazamento.
    await expect(authService.refresh(oldRefreshToken)).rejects.toThrow('Sessão comprometida')

    // Cascata de segurança: o novo token, emitido no passo anterior, também
    // deve ter sido revogado quando o reuso foi detectado.
    await expect(authService.refresh(refreshed.tokens.refreshToken)).rejects.toThrow()
  })
})
