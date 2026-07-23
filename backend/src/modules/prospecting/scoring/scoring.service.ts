import { Injectable } from '@nestjs/common'
import { ProspectConfidence } from '../entities/prospect.entity'
import { DetectedSignal } from './signal-detectors'

export interface ScoringResult {
  score: number
  confidence: ProspectConfidence
  signals: DetectedSignal[]
}

const CONFIDENCE_WEIGHT: Record<ProspectConfidence, number> = { low: 1, medium: 2, high: 3 }

/**
 * Soma os pontos de todos os sinais detectados e limita o resultado a 0-100.
 * O score nunca é armazenado isolado — sempre acompanhado da lista de sinais
 * que o compõem, para que o score seja sempre explicável.
 */
@Injectable()
export class ScoringService {
  score(signals: DetectedSignal[]): ScoringResult {
    const rawTotal = signals.reduce((sum, s) => sum + s.points, 0)
    const score = Math.max(0, Math.min(100, rawTotal))

    return {
      score,
      confidence: this.overallConfidence(signals),
      signals,
    }
  }

  private overallConfidence(signals: DetectedSignal[]): ProspectConfidence {
    if (signals.length === 0) return 'low'
    const avgWeight = signals.reduce((sum, s) => sum + CONFIDENCE_WEIGHT[s.confidence], 0) / signals.length
    if (avgWeight >= 2.5) return 'high'
    if (avgWeight >= 1.5) return 'medium'
    return 'low'
  }
}
