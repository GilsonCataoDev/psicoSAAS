import { parseNeuropsychAnalysis } from './neuropsych-analysis.schema'

const VALID = {
  caseSynthesis: [{ text: 'ok', basis: ['história'], certainty: 'registered_data' }],
  convergences: [],
  divergences: [],
  possiblyPreservedFunctions: [],
  possibleFragilities: [],
  alternativeHypotheses: [],
  missingInformation: [],
  followUpQuestions: [],
  verificationPoints: [],
  suggestedIntegrationStructure: [],
  disclaimers: ['aviso'],
}

describe('parseNeuropsychAnalysis', () => {
  it('aceita JSON válido puro', () => {
    const result = parseNeuropsychAnalysis(JSON.stringify(VALID))
    expect(result).not.toBeNull()
    expect(result?.caseSynthesis[0].certainty).toBe('registered_data')
  })

  it('tolera markdown ao redor do JSON', () => {
    const wrapped = '```json\n' + JSON.stringify(VALID) + '\n```'
    const result = parseNeuropsychAnalysis(wrapped)
    expect(result).not.toBeNull()
  })

  it('rejeita texto sem JSON', () => {
    expect(parseNeuropsychAnalysis('desculpe, não posso ajudar com isso')).toBeNull()
  })

  it('descarta itens com certainty fora do enum permitido, sem derrubar a resposta inteira', () => {
    const bad = {
      ...VALID,
      caseSynthesis: [
        { text: 'válido', basis: [], certainty: 'registered_data' },
        { text: 'inválido', basis: [], certainty: 'tenho certeza absoluta' },
      ],
    }
    const result = parseNeuropsychAnalysis(JSON.stringify(bad))
    expect(result).not.toBeNull()
    expect(result?.caseSynthesis).toHaveLength(1)
    expect(result?.caseSynthesis[0].text).toBe('válido')
  })

  it('rejeita quando um campo obrigatório está ausente do JSON', () => {
    const { caseSynthesis: _omit, ...missingArray } = VALID
    expect(parseNeuropsychAnalysis(JSON.stringify(missingArray))).toBeNull()
  })

  it('rejeita quando disclaimers está totalmente ausente, mas aceita quando vem vazio', () => {
    const { disclaimers: _omit, ...withoutDisclaimers } = VALID
    expect(parseNeuropsychAnalysis(JSON.stringify(withoutDisclaimers))).toBeNull()
    expect(parseNeuropsychAnalysis(JSON.stringify({ ...VALID, disclaimers: [] }))).not.toBeNull()
  })

  it('preenche disclaimers com aviso padrão se vier vazio', () => {
    const result = parseNeuropsychAnalysis(JSON.stringify({ ...VALID, disclaimers: [] }))
    expect(result?.disclaimers.length).toBeGreaterThan(0)
  })

  it('trunca arrays e textos muito longos sem quebrar', () => {
    const huge = { ...VALID, followUpQuestions: Array.from({ length: 100 }, (_, i) => `pergunta ${i}`.repeat(50)) }
    const result = parseNeuropsychAnalysis(JSON.stringify(huge))
    expect(result?.followUpQuestions.length).toBeLessThanOrEqual(30)
    expect(result?.followUpQuestions[0].length).toBeLessThanOrEqual(2000)
  })
})
