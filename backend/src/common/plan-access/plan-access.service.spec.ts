import { PlanAccessService } from './plan-access.service'

describe('PlanAccessService', () => {
  const originalCompedEmails = process.env.COMPED_PRO_EMAILS

  afterEach(() => {
    if (originalCompedEmails === undefined) {
      delete process.env.COMPED_PRO_EMAILS
    } else {
      process.env.COMPED_PRO_EMAILS = originalCompedEmails
    }
    jest.clearAllMocks()
  })

  it('busca a assinatura mais recente e evita consultar o usuário quando o e-mail já é conhecido', async () => {
    const subscription = { plan: 'pro', status: 'active' }
    const subscriptions = {
      findOne: jest.fn().mockResolvedValue(subscription),
    }
    const users = {
      findOne: jest.fn(),
    }
    const service = new PlanAccessService(subscriptions as any, users as any)

    await expect(service.getCurrentPlan('user-1', 'psi@example.com')).resolves.toBe('pro')

    expect(subscriptions.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user-1' },
      order: expect.any(Object),
    }))
    expect(users.findOne).not.toHaveBeenCalled()
  })

  it('consulta o e-mail e aplica a cortesia Pro quando necessário', async () => {
    process.env.COMPED_PRO_EMAILS = 'owner@example.com'
    const subscriptions = {
      findOne: jest.fn().mockResolvedValue(null),
    }
    const users = {
      findOne: jest.fn().mockResolvedValue({ email: 'OWNER@example.com' }),
    }
    const service = new PlanAccessService(subscriptions as any, users as any)

    await expect(service.getCurrentPlan('user-1')).resolves.toBe('pro')
    expect(users.findOne).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: ['email'],
    })
  })

  it('respeita a hierarquia dos planos', async () => {
    const subscriptions = {
      findOne: jest.fn().mockResolvedValue({ plan: 'essential', status: 'active' }),
    }
    const service = new PlanAccessService(subscriptions as any, {} as any)

    await expect(service.hasAccess('user-1', 'free', 'psi@example.com')).resolves.toBe(true)
    await expect(service.hasAccess('user-1', 'pro', 'psi@example.com')).resolves.toBe(false)
  })
})
