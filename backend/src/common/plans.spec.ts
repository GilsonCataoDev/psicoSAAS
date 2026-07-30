import {
  hasPlanAccess,
  isCompedProEmail,
  PLAN_LIMITS,
  PLAN_PRICES,
  resolveEffectivePlan,
} from './plans'

describe('plan catalog', () => {
  it('mantem os planos pagos com preco e limites operacionais', () => {
    expect(PLAN_PRICES).toEqual({ essencial: 79, pro: 149 })
    expect(PLAN_LIMITS.essencial).toMatchObject({
      maxPatients: 50,
      maxDocuments: 200,
      transcriptionMonthlySeconds: 10 * 60,
    })
    expect(PLAN_LIMITS.pro).toMatchObject({
      maxPatients: -1,
      maxDocuments: -1,
      transcriptionMonthlySeconds: 120 * 60,
    })
  })

  it('resolve plano efetivo e aliases em um único lugar', () => {
    expect(resolveEffectivePlan({ status: 'active', plan: 'basic' }, 'psi@example.com')).toBe('basic')
    expect(resolveEffectivePlan({ status: 'past_due', plan: 'pro' }, 'psi@example.com')).toBe('free')
    expect(hasPlanAccess('basic', 'essencial')).toBe(true)
    expect(hasPlanAccess('essencial', 'pro')).toBe(false)
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
