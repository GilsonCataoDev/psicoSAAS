import 'reflect-metadata'
import { AdminGuard } from '../../common/guards/admin.guard'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ChurnController } from './churn.controller'

const GUARDS_METADATA_KEY = '__guards__'

describe('ChurnController — autorização', () => {
  it('protege todas as rotas com autenticação, CSRF e perfil admin', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA_KEY, ChurnController) as unknown[]

    expect(guards).toContain(JwtAuthGuard)
    expect(guards).toContain(CsrfGuard)
    expect(guards).toContain(AdminGuard)
  })

  it('encaminha apenas usuário e admin; o cliente não controla o texto', async () => {
    const sendReactivationWhatsApp = jest.fn().mockResolvedValue({ sent: true })
    const controller = new ChurnController({} as any, { sendReactivationWhatsApp } as any)

    await controller.sendWhatsApp(
      { user: { id: 'admin-1' } },
      'psi-1',
    )

    expect(sendReactivationWhatsApp).toHaveBeenCalledWith('psi-1', 'admin-1')
  })
})
