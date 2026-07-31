import {
  hasPlanAccess,
  isCompedProEmail,
  PLAN_LIMITS,
  PLAN_PRICES,
  resolveEffectivePlan,
} from './plans'

describe('plan catalog', () => {
  it('mantem os planos pagos com preco e limites operacionais', () => {
    expect(PLAN_PRICES).toEqual({ pro: 97.90 })
    expect(PLAN_LIMITS.pro).toMatchObject({
      maxPatients: -1,
      maxDocuments: -1,
      transcriptionMonthlySeconds: 120 * 60,
    })
  })

  it('resolve plano efetivo em um único lugar', () => {
    expect(resolveEffectivePlan({ status: 'active', plan: 'pro' }, 'psi@example.com')).toBe('pro')
    expect(resolveEffectivePlan({ status: 'past_due', plan: 'pro' }, 'psi@example.com')).toBe('free')
    expect(hasPlanAccess('free', 'pro')).toBe(false)
    expect(hasPlanAccess('pro', 'pro')).toBe(true)
  })

  it('reconhece acesso Pro cortesia por e-mail exato', () => {
    const previous = process.env.COMPED_PRO_EMAILS
    process.env.COMPED_PRO_EMAILS = 'pro@example.com, outra@example.com'
    try {
      expect(isCompedProEmail(' PRO@example.com ')).toBe(true)
      expect(isCompedProEmail('not-pro@example.com')).toBe(false)
      expect(resolveEffectivePlan(null, 'pro@example.com')).toBe('pro')
    } finally {
      if (previous === undefined) delete process.env.COMPED_PRO_EMAILS
      else process.env.COMPED_PRO_EMAILS = previous
    }
  })
})
