import { describe, expect, it } from 'vitest'
import { calcScaleScore, getCriticalResponses, interpretScaleResult, SCALE_CONFIGS } from './scale-scoring'

describe('BDI-II-adaptado', () => {
  it('soma os 21 itens e classifica pelas faixas oficiais', () => {
    const config = SCALE_CONFIGS['bdi2-adaptado']
    const zeroAnswers = Object.fromEntries(config.items.map(item => [item.id, '0']))

    expect(calcScaleScore('bdi2-adaptado', zeroAnswers)).toEqual({ score: 0, scoreDetails: null })

    const minimalAnswers = { ...zeroAnswers, q1: '3', q2: '3' }
    expect(calcScaleScore('bdi2-adaptado', minimalAnswers).score).toBe(6)

    const severe = Object.fromEntries(config.items.map(item => [item.id, '3']))
    const { score } = calcScaleScore('bdi2-adaptado', severe)
    expect(score).toBe(63)
    expect(interpretScaleResult('bdi2-adaptado', score, null, severe)?.level?.label).toBe('Grave')
  })

  it('sinaliza o item 9 (ideação de autoagressão) quando positivo', () => {
    const config = SCALE_CONFIGS['bdi2-adaptado']
    const answers = Object.fromEntries(config.items.map(item => [item.id, '0']))
    answers.q9 = '2'

    const critical = getCriticalResponses('bdi2-adaptado', answers)
    expect(critical).toHaveLength(1)
    expect(critical[0]).toEqual(expect.objectContaining({ value: 2 }))
  })

  it('classifica corretamente nas faixas mínimo/leve/moderado', () => {
    expect(interpretScaleResult('bdi2-adaptado', 10, null, null)?.level?.label).toBe('Mínimo')
    expect(interpretScaleResult('bdi2-adaptado', 15, null, null)?.level?.label).toBe('Leve')
    expect(interpretScaleResult('bdi2-adaptado', 25, null, null)?.level?.label).toBe('Moderado')
  })
})

describe('EVA — Escala Visual Analógica de Dor', () => {
  it('pontua de 0 a 10 a partir do item único', () => {
    expect(calcScaleScore('eva-dor', { q1: '0' })).toEqual({ score: 0, scoreDetails: null })
    expect(calcScaleScore('eva-dor', { q1: '10' })).toEqual({ score: 10, scoreDetails: null })
  })

  it('classifica nas faixas de intensidade', () => {
    expect(interpretScaleResult('eva-dor', 0, null, null)?.level?.label).toBe('Sem dor')
    expect(interpretScaleResult('eva-dor', 3, null, null)?.level?.label).toBe('Dor leve')
    expect(interpretScaleResult('eva-dor', 6, null, null)?.level?.label).toBe('Dor moderada')
    expect(interpretScaleResult('eva-dor', 9, null, null)?.level?.label).toBe('Dor intensa')
  })
})

describe('Índice de Oswestry (ODI)', () => {
  const config = SCALE_CONFIGS['oswestry']
  const zero = Object.fromEntries(config.items.map(item => [item.id, '0']))

  it('tem as 10 seções, cada uma com 6 alternativas próprias', () => {
    expect(config.items).toHaveLength(10)
    for (const item of config.items) {
      expect(item.options).toHaveLength(6)
      expect(item.options?.map(o => o.value)).toEqual([0, 1, 2, 3, 4, 5])
    }
  })

  it('converte a soma bruta em percentual multiplicando por 2', () => {
    expect(calcScaleScore('oswestry', zero).score).toBe(0)

    // Bruto máximo 50 → 100%.
    const max = Object.fromEntries(config.items.map(item => [item.id, '5']))
    expect(calcScaleScore('oswestry', max).score).toBe(100)

    // Bruto 10 → 20%.
    const parcial = { ...zero, q1: '5', q2: '5' }
    expect(calcScaleScore('oswestry', parcial).score).toBe(20)
  })

  it('classifica pelas faixas de incapacidade do ODI', () => {
    expect(interpretScaleResult('oswestry', 20, null, null)?.level?.label).toBe('Incapacidade mínima')
    expect(interpretScaleResult('oswestry', 40, null, null)?.level?.label).toBe('Incapacidade moderada')
    expect(interpretScaleResult('oswestry', 60, null, null)?.level?.label).toBe('Incapacidade intensa')
    expect(interpretScaleResult('oswestry', 100, null, null)?.level?.label).toBe('Restrito ao leito')
  })
})

describe('Escala de Equilíbrio de Berg', () => {
  const config = SCALE_CONFIGS['berg']
  const zero = Object.fromEntries(config.items.map(item => [item.id, '0']))

  it('soma as 14 tarefas de 0 a 4, com máximo de 56', () => {
    expect(config.items).toHaveLength(14)
    expect(calcScaleScore('berg', zero).score).toBe(0)

    const max = Object.fromEntries(config.items.map(item => [item.id, '4']))
    expect(calcScaleScore('berg', max).score).toBe(56)
  })

  it('classifica pelo risco de queda', () => {
    expect(interpretScaleResult('berg', 20, null, null)?.level?.label).toBe('Alto risco de queda')
    expect(interpretScaleResult('berg', 40, null, null)?.level?.label).toBe('Risco moderado de queda')
    expect(interpretScaleResult('berg', 56, null, null)?.level?.label).toBe('Baixo risco de queda')
  })
})
