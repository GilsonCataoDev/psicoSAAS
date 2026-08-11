import { describe, expect, it } from 'vitest'
import type { FinancialRecord, Session } from '@/types'
import {
  buildMoodChartData,
  buildScaleEvolutionSeries,
  calculateFinancialTotals,
  countMonthlySessions,
  selectClinicalSessions,
  selectFilledProntuarioFields,
  type ScaleEvolutionAssignment,
} from './patient-detail-summary'

const financialRecord = (
  amount: number,
  status: FinancialRecord['status'],
): FinancialRecord => ({
  id: `${status}-${amount}`,
  patientId: 'patient-1',
  type: 'income',
  amount,
  description: 'Sessão',
  status,
  createdAt: '2026-07-01T10:00:00.000Z',
})

const session = (
  id: string,
  date: string,
  mood?: Session['mood'],
  tags: Session['tags'] = [],
): Session => ({
  id,
  patientId: 'patient-1',
  date,
  duration: 50,
  mood,
  tags,
  paymentStatus: 'pending',
  createdAt: date,
  updatedAt: date,
})

describe('patient-detail-summary', () => {
  it('separa valores pagos dos pendentes e vencidos', () => {
    expect(calculateFinancialTotals([
      financialRecord(100, 'paid'),
      financialRecord(80, 'pending'),
      financialRecord(20, 'overdue'),
    ])).toEqual({ totalPaid: 100, totalPending: 100 })
  })

  it('remove aplicações de instrumentos e conta apenas sessões clínicas do mês', () => {
    const sessions = [
      session('july', '2026-07-10T10:00:00.000Z'),
      session('june', '2026-06-10T10:00:00.000Z'),
      session('instrument', '2026-07-12T10:00:00.000Z', undefined, ['instrumento' as never]),
    ]
    const clinical = selectClinicalSessions(sessions)

    expect(clinical.map(item => item.id)).toEqual(['july', 'june'])
    expect(countMonthlySessions(clinical, new Date('2026-07-30T12:00:00.000Z'))).toBe(1)
  })

  it('só cria gráfico com pelo menos dois registros de humor', () => {
    expect(buildMoodChartData([session('one', '2026-07-10T10:00:00.000Z', 3)])).toEqual([])
    expect(buildMoodChartData([
      session('newer', '2026-07-20T10:00:00.000Z', 4),
      session('older', '2026-07-10T10:00:00.000Z', 2),
    ])).toHaveLength(2)
  })

  it('considera preenchidos apenas campos textuais não vazios do prontuário', () => {
    const fields = selectFilledProntuarioFields({
      queixaPrincipal: 'Ansiedade',
      historicoDoenca: '   ',
      objetivos: null,
    })

    expect(fields.map(field => field.key)).toEqual(['queixaPrincipal'])
  })

  it('só monta série de evolução para instrumentos com 2+ respostas pontuadas, ordenadas por data', () => {
    const scaleAssignment = (
      instrumentId: string,
      title: string,
      score: number | null,
      completedAt: string,
      status: ScaleEvolutionAssignment['status'] = 'completed',
    ): ScaleEvolutionAssignment => ({ instrumentId, title, status, score, completedAt, createdAt: completedAt })

    const series = buildScaleEvolutionSeries([
      scaleAssignment('phq9', 'PHQ-9', 18, '2026-07-20T10:00:00.000Z'),
      scaleAssignment('phq9', 'PHQ-9', 12, '2026-07-06T10:00:00.000Z'),
      scaleAssignment('gad7', 'GAD-7', 9, '2026-07-10T10:00:00.000Z'),
      scaleAssignment('gad7', 'GAD-7', null, '2026-07-24T10:00:00.000Z'),
      scaleAssignment('phq9', 'PHQ-9', 5, '2026-07-24T10:00:00.000Z', 'pending'),
    ])

    expect(series).toHaveLength(1)
    expect(series[0].instrumentId).toBe('phq9')
    expect(series[0].points.map(p => p.value)).toEqual([12, 18])
  })
})
