import { ScoringService } from './scoring.service'
import { DetectedSignal } from './signal-detectors'

function signal(points: number, overrides: Partial<DetectedSignal> = {}): DetectedSignal {
  return {
    type: 'whatsapp_scheduling',
    points,
    confidence: 'medium',
    evidence: 'evidência de teste',
    evidenceUrl: 'https://example.com',
    detector: 'test',
    ...overrides,
  }
}

describe('ScoringService', () => {
  const svc = new ScoringService()

  it('soma os pontos de todos os sinais', () => {
    const result = svc.score([signal(20), signal(15), signal(-10)])
    expect(result.score).toBe(25)
  })

  it('nunca retorna score abaixo de 0', () => {
    const result = svc.score([signal(-30), signal(-50), signal(-20)])
    expect(result.score).toBe(0)
  })

  it('nunca retorna score acima de 100', () => {
    const result = svc.score([signal(50), signal(40), signal(30), signal(20)])
    expect(result.score).toBe(100)
  })

  it('retorna score 0 quando não há sinais', () => {
    const result = svc.score([])
    expect(result.score).toBe(0)
    expect(result.confidence).toBe('low')
  })

  it('sempre retorna a lista de sinais junto com o score (nunca só o número)', () => {
    const signals = [signal(20), signal(15)]
    const result = svc.score(signals)
    expect(result.signals).toEqual(signals)
    expect(result.signals.length).toBe(2)
  })

  it('confiança é maior quando os sinais têm confiança alta', () => {
    const result = svc.score([
      signal(20, { confidence: 'high' }),
      signal(15, { confidence: 'high' }),
    ])
    expect(result.confidence).toBe('high')
  })
})
