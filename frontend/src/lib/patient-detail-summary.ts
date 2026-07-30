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
