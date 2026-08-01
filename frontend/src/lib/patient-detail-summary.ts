import type { FinancialRecord, Session } from '@/types'
import { formatDate } from '@/lib/utils'

export const PRONTUARIO_FIELDS = [
  { key: 'queixaPrincipal', label: 'Queixa principal' },
  { key: 'historicoDoenca', label: 'História da situação atual' },
  { key: 'antecedentesPessoais', label: 'Antecedentes pessoais' },
  { key: 'historicoFamiliar', label: 'Histórico familiar' },
  { key: 'abordagem', label: 'Abordagem' },
  { key: 'objetivos', label: 'Objetivos terapêuticos' },
  { key: 'frequencia', label: 'Frequência' },
] as const

export function calculateFinancialTotals(financialRecords: FinancialRecord[]) {
  const totalPaid = financialRecords
    .filter(record => record.status === 'paid')
    .reduce((sum, record) => sum + Number(record.amount), 0)
  const totalPending = financialRecords
    .filter(record => record.status !== 'paid')
    .reduce((sum, record) => sum + Number(record.amount), 0)

  return { totalPaid, totalPending }
}

export function selectClinicalSessions(sessions: Session[]) {
  return sessions.filter(
    session => !session.tags?.some(tag => String(tag) === 'instrumento'),
  )
}

export function countMonthlySessions(clinicalSessions: Session[], now = new Date()) {
  const currentMonth = now.toISOString().slice(0, 7)
  return clinicalSessions.filter(
    session => String(session.date).startsWith(currentMonth),
  ).length
}

export function buildMoodChartData(clinicalSessions: Session[]) {
  const sessionsWithMood = [...clinicalSessions].reverse().filter(session => session.mood)
  return sessionsWithMood.length < 2
    ? []
    : sessionsWithMood.map(session => ({
        label: formatDate(session.date),
        humor: session.mood,
      }))
}

export type ScaleEvolutionAssignment = {
  instrumentId: string
  title: string
  status: string
  score?: number | null
  completedAt?: string
  createdAt: string
}

export type ScaleEvolutionSeries = {
  instrumentId: string
  title: string
  points: Array<{ label: string; value: number }>
}

/** Uma série por instrumento, só para os que têm 2+ respostas pontuadas — dá pra traçar uma linha de evolução. */
export function buildScaleEvolutionSeries(assignments: ScaleEvolutionAssignment[]): ScaleEvolutionSeries[] {
  const byInstrument = new Map<string, ScaleEvolutionAssignment[]>()
  for (const item of assignments) {
    if (item.status !== 'completed' || item.score == null) continue
    const list = byInstrument.get(item.instrumentId) ?? []
    list.push(item)
    byInstrument.set(item.instrumentId, list)
  }

  const series: ScaleEvolutionSeries[] = []
  for (const [instrumentId, items] of byInstrument) {
    if (items.length < 2) continue
    const sorted = [...items].sort((a, b) =>
      new Date(a.completedAt ?? a.createdAt).getTime() - new Date(b.completedAt ?? b.createdAt).getTime(),
    )
    series.push({
      instrumentId,
      title: sorted[0].title,
      points: sorted.map(item => ({
        label: formatDate(item.completedAt ?? item.createdAt),
        value: Number(item.score),
      })),
    })
  }

  return series.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
}

export function selectFilledProntuarioFields(prontuario: Record<string, unknown>) {
  return PRONTUARIO_FIELDS.filter(field => {
    const value = prontuario[field.key]
    return typeof value === 'string' && value.trim().length > 0
  })
}

export function buildPatientDetailSummary(
  financialRecords: FinancialRecord[],
  sessions: Session[],
  prontuario: Record<string, unknown>,
  now = new Date(),
) {
  const { totalPaid, totalPending } = calculateFinancialTotals(financialRecords)
  const clinicalSessions = selectClinicalSessions(sessions)

  return {
    totalPaid,
    totalPending,
    clinicalSessions,
    monthlySessionsUsed: countMonthlySessions(clinicalSessions, now),
    moodChartData: buildMoodChartData(clinicalSessions),
    filledProntuarioFields: selectFilledProntuarioFields(prontuario),
  }
}
