import { formatCrpForDisplay } from './user.entity'

describe('formatCrpForDisplay', () => {
  it('retorna o CRP real quando presente', () => {
    expect(formatCrpForDisplay({ crp: '06/123456', isStudent: false })).toBe('06/123456')
  })

  it('retorna "Estudante de Psicologia" quando não há CRP e a conta é de estudante', () => {
    expect(formatCrpForDisplay({ crp: null, isStudent: true })).toBe('Estudante de Psicologia')
  })

  it('retorna null quando não há CRP e a conta não é de estudante', () => {
    expect(formatCrpForDisplay({ crp: null, isStudent: false })).toBeNull()
  })

  it('prioriza o CRP real mesmo se isStudent estiver marcado (ex: já regularizou)', () => {
    expect(formatCrpForDisplay({ crp: '06/123456', isStudent: true })).toBe('06/123456')
  })
})
