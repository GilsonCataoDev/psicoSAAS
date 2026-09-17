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

describe('DASH — Disabilities of the Arm, Shoulder and Hand', () => {
  const config = SCALE_CONFIGS['dash']
  // Itens usam escala 1–5; soma bruta mínima = 30 (n=30 × 1), máxima = 150 (n=30 × 5)
  const minAnswers = Object.fromEntries(config.items.map(i => [i.id, '1']))
  const maxAnswers = Object.fromEntries(config.items.map(i => [i.id, '5']))

  it('tem 30 itens com opções de 1 a 5', () => {
    expect(config.items).toHaveLength(30)
    for (const item of config.items) {
      expect(item.options ?? config.options).toHaveLength(5)
    }
  })

  it('soma bruta mínima é 30 (todos os itens = 1)', () => {
    expect(calcScaleScore('dash', minAnswers).score).toBe(30)
  })

  it('soma bruta máxima é 150 (todos os itens = 5)', () => {
    expect(calcScaleScore('dash', maxAnswers).score).toBe(150)
  })

  it('classifica nas faixas de incapacidade pelo limiar da soma bruta', () => {
    // Os thresholds são aplicados à soma bruta; DASH % = (soma−30)/120×100
    // soma=30 → DASH=0 (sem incapacidade); soma 31–54 → DASH 1–20 % (leve)
    expect(interpretScaleResult('dash', 30, null, null)?.level?.label).toBe('Sem incapacidade')
    expect(interpretScaleResult('dash', 54, null, null)?.level?.label).toBe('Incapacidade leve')
    expect(interpretScaleResult('dash', 78, null, null)?.level?.label).toBe('Incapacidade moderada')
    expect(interpretScaleResult('dash', 102, null, null)?.level?.label).toBe('Incapacidade significativa')
    expect(interpretScaleResult('dash', 150, null, null)?.level?.label).toBe('Incapacidade grave')
  })
})

describe('Tinetti — Avaliação de Equilíbrio e Marcha', () => {
  const config = SCALE_CONFIGS['tinetti']
  // Máximo: pega o valor mais alto de cada item de acordo com suas opções próprias
  const maxAnswers = Object.fromEntries(
    config.items.map(i => {
      const opts = i.options ?? config.options
      return [i.id, String(Math.max(...opts.map(o => o.value)))]
    })
  )
  const zeroAnswers = Object.fromEntries(config.items.map(i => [i.id, '0']))

  it('soma mínima é 0 e máxima é 28 (equilíbrio 16 + marcha 12)', () => {
    expect(calcScaleScore('tinetti', zeroAnswers).score).toBe(0)
    expect(calcScaleScore('tinetti', maxAnswers).score).toBe(28)
  })

  it('score 28 indica baixo risco de quedas', () => {
    expect(interpretScaleResult('tinetti', 28, null, null)?.level?.label).toBe('Baixo risco')
  })

  it('score 19 indica risco moderado (>18 e ≤24)', () => {
    expect(interpretScaleResult('tinetti', 19, null, null)?.level?.label).toBe('Risco moderado')
  })

  it('score 18 e abaixo indica alto risco de quedas', () => {
    // O limiar max:18 é alcançado com score=18, não score=19
    expect(interpretScaleResult('tinetti', 18, null, null)?.level?.label).toBe('Alto risco de quedas')
    expect(interpretScaleResult('tinetti', 10, null, null)?.level?.label).toBe('Alto risco de quedas')
  })
})

describe('PREDIMED — Adesão à Dieta Mediterrânea', () => {
  const config = SCALE_CONFIGS['predimed']
  const allYes  = Object.fromEntries(config.items.map(i => [i.id, '1']))
  const allNo   = Object.fromEntries(config.items.map(i => [i.id, '0']))

  it('tem 14 itens binários (0 = não, 1 = sim), score 0–14', () => {
    expect(config.items).toHaveLength(14)
    expect(calcScaleScore('predimed', allNo).score).toBe(0)
    expect(calcScaleScore('predimed', allYes).score).toBe(14)
  })

  it('score 14 indica boa adesão à dieta mediterrânea', () => {
    expect(interpretScaleResult('predimed', 14, null, null)?.level?.label).toBe('Boa adesão')
  })

  it('score 9 indica adesão moderada (>6 e ≤9)', () => {
    expect(interpretScaleResult('predimed', 9, null, null)?.level?.label).toBe('Adesão moderada')
  })

  it('score 4 indica baixa adesão (≤6)', () => {
    expect(interpretScaleResult('predimed', 4, null, null)?.level?.label).toBe('Baixa adesão')
  })
})

describe('GAD-7', () => {
  it('não dispara alerta de item crítico (GAD-7 não tem item de suicidalidade)', () => {
    // GAD-7 mede ansiedade; ao contrário do PHQ-9 não tem item de ideação — nenhum
    // criticalItem deve ser registrado mesmo com todas as respostas no máximo (3)
    const answers = Object.fromEntries(
      ['q1','q2','q3','q4','q5','q6','q7'].map(id => [id, '3'])
    )
    const alerts = getCriticalResponses('gad7', answers)
    expect(alerts).toHaveLength(0)
  })
})
