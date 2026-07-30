import { PLAN_LIMITS, PLAN_PRICES } from './plans'

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
})
