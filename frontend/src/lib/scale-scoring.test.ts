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
