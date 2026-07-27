import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { CalendarClock, Repeat2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCreateAppointment } from '@/hooks/useApi'
import { Patient } from '@/types'
import { calcSessionPreview, fixedScheduleLabel, nextOccurrenceFromAnchor } from '@/lib/recurringSchedule'

type Props = {
  patient: Patient
  anchorDate: string | null
  anchorLabel: string
  onScheduled?: () => void
}

export default function RecurringSessionsCard({ patient, anchorDate, anchorLabel, onScheduled }: Props) {
  const navigate = useNavigate()
  const createAppointment = useCreateAppointment()
  const [repeatUntil, setRepeatUntil] = useState('')

  if (!patient.hasFixedSchedule || patient.fixedScheduleWeekday === undefined || !patient.fixedScheduleTime) {
    return null
  }

  const frequency = patient.fixedScheduleFrequency ?? 'weekly'
  const nextDate = nextOccurrenceFromAnchor(anchorDate, patient.fixedScheduleWeekday, frequency)
  const preview = calcSessionPreview(nextDate, frequency, repeatUntil)
  const label = fixedScheduleLabel(patient)

  async function handleBookDirectly() {
    try {
      const created = await createAppointment.mutateAsync({
        patientId: patient.id,
        date: nextDate,
        time: patient.fixedScheduleTime,
        duration: patient.sessionDuration,
        modality: patient.fixedScheduleModality ?? 'presencial',
        recurrence: frequency,
        repeatUntil: repeatUntil || undefined,
        fromFixedSchedule: true,
      } as any)
      toast.success(Array.isArray(created) ? `${created.length} sessões agendadas` : 'Sessão agendada')
      onScheduled?.()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Não foi possível agendar. Tente pela agenda para ajustar o horário.')
    }
  }

  function handleGoToAgenda() {
    const params = new URLSearchParams({
      new: '1',
      patientId: patient.id,
      date: nextDate,
      recurrence: frequency,
    })
    if (repeatUntil) params.set('repeatUntil', repeatUntil)
    navigate(`/agenda?${params.toString()}`)
  }

  return (
    <section className="rounded-2xl border border-sage-100 bg-gradient-to-br from-sage-50 to-white p-5 shadow-card dark:border-sage-400/20 dark:from-sage-950/30 dark:to-cognia-panel">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-sage-100 p-2.5 text-sage-700 dark:bg-sage-900/50 dark:text-sage-200">
          <Repeat2 className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-neutral-900 dark:text-white">Próximas sessões</h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            {anchorLabel} · Horário fixo {label}
          </p>

          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-sage-200 bg-white px-3 py-2 text-xs dark:border-sage-400/20 dark:bg-white/5">
              <CalendarClock className="h-3.5 w-3.5 text-sage-600" />
              <span className="text-neutral-700 dark:text-neutral-200">
                Próxima: <strong>{format(parseISO(nextDate), 'dd/MM/yyyy')}</strong>
              </span>
            </div>
            <div>
              <label className="label text-xs">Marcar até quando?</label>
              <input
                type="date"
                value={repeatUntil}
                onChange={e => setRepeatUntil(e.target.value)}
                className="input-field py-1.5 text-sm"
                min={nextDate}
              />
            </div>
          </div>

          {preview && (
            <p className="mt-2 text-xs text-sage-700 dark:text-sage-200">
              {preview.count} {preview.count !== 1 ? 'sessões' : 'sessão'} até {format(preview.lastDate, 'dd/MM/yyyy')}
              {!repeatUntil && ' (limite padrão de 3 meses — defina uma data acima para mudar)'}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleBookDirectly}
              disabled={createAppointment.isPending}
              className="btn-primary text-sm"
            >
              {createAppointment.isPending ? 'Marcando...' : 'Marcar direto'}
            </button>
            <button type="button" onClick={handleGoToAgenda} className="btn-secondary text-sm">
              Ir para agenda
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
