import { addDays, addMonths, isAfter, isBefore, parseISO, startOfDay } from 'date-fns'
import { Patient } from '@/types'

export const WEEKDAY_LABELS = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']

export function fixedScheduleLabel(patient?: Patient | null): string {
  if (!patient?.hasFixedSchedule || patient.fixedScheduleWeekday === undefined || !patient.fixedScheduleTime) {
    return ''
  }
  const frequency = patient.fixedScheduleFrequency === 'biweekly' ? 'de 15 em 15 dias' : 'toda semana'
  return `${frequency}, ${WEEKDAY_LABELS[patient.fixedScheduleWeekday]} as ${patient.fixedScheduleTime}`
}

export function calcSessionPreview(
  dateStr: string,
  recurrence: 'weekly' | 'biweekly',
  repeatUntilStr: string,
): { count: number; lastDate: Date; effectiveUntil: Date } | null {
  if (!dateStr) return null
  const start = parseISO(dateStr)
  const effectiveUntil = repeatUntilStr ? parseISO(repeatUntilStr) : addMonths(start, 3)
  const step = recurrence === 'weekly' ? 7 : 14
  let count = 0
  let current = start
  let lastDate = start
  while (!isAfter(current, effectiveUntil) && count < 52) {
    lastDate = current
    count += 1
    current = addDays(current, step)
  }
  return count > 0 ? { count, lastDate, effectiveUntil } : null
}

/**
 * Próxima data de uma sessão recorrente.
 *
 * - `anchorDateStr = null` (sem histórico — ex: paciente novo): encontra a próxima
 *   ocorrência do dia da semana a partir de hoje, podendo ser o próprio hoje.
 * - `anchorDateStr` = último agendamento real: a âncora já representa uma sessão
 *   marcada, então o resultado é sempre POSTERIOR a ela (nunca a mesma data —
 *   senão sugeriríamos remarcar em cima de uma sessão que já existe). Se a âncora
 *   cair no dia da semana certo, soma exatamente um ciclo (7 ou 14 dias),
 *   preservando a paridade quinzenal. Se não cair (ex: sessão remarcada), alinha
 *   pro próximo dia certo mais próximo.
 */
export function nextOccurrenceFromAnchor(
  anchorDateStr: string | null,
  weekday: number,
  frequency: 'weekly' | 'biweekly',
): string {
  const step = frequency === 'biweekly' ? 14 : 7
  const today = startOfDay(new Date())

  let current: Date
  if (!anchorDateStr) {
    current = addDays(today, (weekday - today.getDay() + 7) % 7)
  } else {
    const anchor = startOfDay(parseISO(anchorDateStr))
    if (anchor.getDay() === weekday) {
      current = addDays(anchor, step)
    } else {
      const weekdayDiff = (weekday - anchor.getDay() + 7) % 7
      current = addDays(anchor, weekdayDiff || 7)
    }
  }

  while (isBefore(current, today)) {
    current = addDays(current, step)
  }

  return current.toISOString().slice(0, 10)
}
