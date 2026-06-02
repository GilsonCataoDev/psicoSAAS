import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import Modal from '@/components/ui/Modal'
import toast from 'react-hot-toast'
import { addDays, addMonths, format, isAfter, parseISO } from 'date-fns'
import { usePatients, useCreateAppointment, useUpdateAppointment, useUpdateAppointmentGroup } from '@/hooks/useApi'
import { Appointment, Patient } from '@/types'

type FormData = {
  patientId: string
  date: string
  time: string
  duration: number
  modality: 'presencial' | 'online'
  notes: string
  recurrence: 'none' | 'weekly' | 'biweekly'
  repeatUntil: string
}

type Props = {
  open: boolean
  onClose: () => void
  appointment?: Appointment | null
}

const WEEKDAY_LABELS = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']

function calcSessionPreview(
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
    count++
    current = addDays(current, step)
  }
  return count > 0 ? { count, lastDate, effectiveUntil } : null
}

function nextDateForWeekday(weekday: number): string {
  const today = new Date()
  const diff = (weekday - today.getDay() + 7) % 7
  return format(addDays(today, diff), 'yyyy-MM-dd')
}

function fixedScheduleLabel(patient?: Patient): string {
  if (!patient?.hasFixedSchedule || patient.fixedScheduleWeekday === undefined || !patient.fixedScheduleTime) {
    return ''
  }
  const frequency = patient.fixedScheduleFrequency === 'biweekly' ? 'de 15 em 15 dias' : 'toda semana'
  return `${frequency}, ${WEEKDAY_LABELS[patient.fixedScheduleWeekday]} as ${patient.fixedScheduleTime}`
}

export default function NewAppointmentModal({ open, onClose, appointment }: Props) {
  const { data: patients = [] } = usePatients()
  const createAppointment = useCreateAppointment()
  const updateAppointment = useUpdateAppointment()
  const updateGroup = useUpdateAppointmentGroup()
  const isEditing = Boolean(appointment)
  const [editScope, setEditScope] = useState<'single' | 'future'>('single')

  const { register, handleSubmit, reset, watch, setValue, formState: { isSubmitting } } = useForm<FormData>({
    defaultValues: {
      patientId: '',
      date: '',
      time: '09:00',
      duration: 50,
      modality: 'presencial',
      notes: '',
      recurrence: 'none',
      repeatUntil: '',
    },
  })

  const patientId = watch('patientId')
  const recurrence = watch('recurrence')
  const date = watch('date')
  const time = watch('time')
  const repeatUntil = watch('repeatUntil')
  const selectedPatient = patients.find(p => p.id === patientId)
  const fixedLabel = fixedScheduleLabel(selectedPatient)

  const sessionPreview =
    !isEditing && recurrence !== 'none'
      ? calcSessionPreview(date, recurrence, repeatUntil)
      : null

  useEffect(() => {
    if (!open) { setEditScope('single'); return }
    if (appointment) {
      reset({
        patientId: appointment.patientId,
        date: appointment.date,
        time: appointment.time?.slice(0, 5) ?? '09:00',
        duration: appointment.duration,
        modality: appointment.modality,
        notes: appointment.notes ?? '',
        recurrence: 'none',
        repeatUntil: '',
      })
      return
    }
    reset({
      patientId: '',
      date: '',
      time: '09:00',
      duration: 50,
      modality: 'presencial',
      notes: '',
      recurrence: 'none',
      repeatUntil: '',
    })
  }, [open, appointment, reset])

  function applyFixedSchedule() {
    if (!selectedPatient?.hasFixedSchedule || selectedPatient.fixedScheduleWeekday === undefined || !selectedPatient.fixedScheduleTime) {
      toast.error('Essa pessoa ainda não tem horário fixo cadastrado.')
      return
    }
    setValue('date', nextDateForWeekday(selectedPatient.fixedScheduleWeekday))
    setValue('time', selectedPatient.fixedScheduleTime)
    setValue('duration', selectedPatient.sessionDuration)
    setValue('modality', selectedPatient.fixedScheduleModality ?? 'presencial')
    setValue('recurrence', selectedPatient.fixedScheduleFrequency ?? 'weekly')
  }

  async function onSubmit(data: FormData) {
    try {
      const duration = Number(data.duration)
      if (isEditing && appointment) {
        if (editScope === 'future' && appointment.recurringGroupId) {
          const result = await updateGroup.mutateAsync({
            groupId: appointment.recurringGroupId,
            fromDate: appointment.date,
            data: { time: data.time, duration, modality: data.modality, notes: data.notes },
          })
          toast.success(`${result.updated} sessões atualizadas`)
        } else {
          await updateAppointment.mutateAsync({
            id: appointment.id,
            data: { ...data, duration, recurrence: 'none' } as any,
          })
          toast.success('Sessão atualizada')
        }
      } else {
        const payload = {
          ...data,
          duration,
          recurrence: data.recurrence,
          repeatUntil: data.recurrence === 'none' ? undefined : data.repeatUntil || undefined,
        }
        const created = await createAppointment.mutateAsync(payload as any)
        toast.success(Array.isArray(created) ? `${created.length} sessões agendadas` : 'Sessão agendada')
      }
      reset()
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Erro ao agendar. Tente novamente.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Alterar esta ocorrência' : 'Agendar nova sessão'}
      description={isEditing
        ? 'A mudança vale apenas para este atendimento.'
        : 'Crie um atendimento único, semanal ou de 15 em 15 dias.'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Pessoa</label>
          <select {...register('patientId', { required: true })} className="input-field" disabled={isEditing}>
            <option value="">Selecione...</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {fixedLabel && !isEditing && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-sage-100 bg-sage-50 px-3 py-2">
            <p className="text-xs text-sage-700">Horario fixo: {fixedLabel}</p>
            <button type="button" onClick={applyFixedSchedule} className="btn-secondary text-xs py-1.5 px-3">
              Usar
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Data</label>
            <input
              {...register('date', { required: true })}
              type="date"
              className="input-field disabled:opacity-50"
              disabled={isEditing && editScope === 'future'}
            />
          </div>
          <div>
            <label className="label">Horario</label>
            <input {...register('time')} type="time" className="input-field" />
          </div>
          <div>
            <label className="label">Duracao (min)</label>
            <input {...register('duration')} type="number" className="input-field" />
          </div>
          <div>
            <label className="label">Modalidade</label>
            <select {...register('modality')} className="input-field">
              <option value="presencial">Presencial</option>
              <option value="online">Online</option>
            </select>
          </div>
        </div>

        {!isEditing && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Recorrência</label>
              <select {...register('recurrence')} className="input-field">
                <option value="none">Não repetir</option>
                <option value="weekly">Toda semana</option>
                <option value="biweekly">De 15 em 15 dias</option>
              </select>
            </div>
            <div>
              <label className="label">Repetir até</label>
              <input
                {...register('repeatUntil')}
                type="date"
                className="input-field"
                disabled={recurrence === 'none'}
              />
            </div>
          </div>
        )}

        {sessionPreview && (
          <div className="rounded-xl border border-sage-200 dark:border-sage-700/40 bg-sage-50 dark:bg-sage-900/20 px-4 py-3">
            <p className="text-sm font-medium text-sage-800 dark:text-sage-200">
              {sessionPreview.count} {sessionPreview.count === 1 ? 'sessão será criada' : 'sessões serão criadas'}
            </p>
            <p className="mt-0.5 text-xs text-sage-600 dark:text-sage-400">
              de {format(parseISO(date), 'dd/MM/yyyy')} até {format(sessionPreview.lastDate, 'dd/MM/yyyy')}
              {' · '}{recurrence === 'weekly' ? 'toda semana' : 'de 15 em 15 dias'}
              {time ? ` · às ${time}` : ''}
              {!repeatUntil && ' · limite padrão de 3 meses'}
            </p>
          </div>
        )}

        {isEditing && appointment?.isRecurring && (
          <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-white/10">
            <button
              type="button"
              onClick={() => setEditScope('single')}
              className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                editScope === 'single'
                  ? 'bg-sage-50 dark:bg-sage-900/20'
                  : 'hover:bg-neutral-50 dark:hover:bg-white/5'
              }`}
            >
              <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                editScope === 'single' ? 'border-sage-500 bg-sage-500' : 'border-neutral-300 dark:border-white/30'
              }`}>
                {editScope === 'single' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
              <div>
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">Alterar apenas esta sessão</p>
                <p className="text-xs text-neutral-400">As demais sessões da série não serão afetadas</p>
              </div>
            </button>
            <div className="border-t border-neutral-100 dark:border-white/5" />
            <button
              type="button"
              onClick={() => setEditScope('future')}
              className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                editScope === 'future'
                  ? 'bg-sage-50 dark:bg-sage-900/20'
                  : 'hover:bg-neutral-50 dark:hover:bg-white/5'
              }`}
            >
              <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                editScope === 'future' ? 'border-sage-500 bg-sage-500' : 'border-neutral-300 dark:border-white/30'
              }`}>
                {editScope === 'future' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
              <div>
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">Alterar esta e as próximas</p>
                <p className="text-xs text-neutral-400">Aplica horário, duração e modalidade a todas as sessões a partir desta data</p>
              </div>
            </button>
          </div>
        )}

        <div>
          <label className="label">Observações (opcional)</label>
          <textarea {...register('notes')} rows={2} className="input-field resize-none" placeholder="Alguma informação relevante para esta sessão..." />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button
            type="submit"
            disabled={isSubmitting || createAppointment.isPending || updateAppointment.isPending || updateGroup.isPending}
            className="btn-primary flex items-center gap-2"
          >
            {(isSubmitting || createAppointment.isPending || updateAppointment.isPending || updateGroup.isPending) && (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {!isEditing ? 'Agendar' : editScope === 'future' ? 'Salvar para as proximas' : 'Salvar alteracao'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
