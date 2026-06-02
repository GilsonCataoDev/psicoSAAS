import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { addDays, addMonths, format, isAfter, parseISO } from 'date-fns'
import { CalendarClock, Repeat2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import toast from 'react-hot-toast'
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
    count += 1
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
    if (!open) {
      setEditScope('single')
      return
    }

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
      toast.error('Essa pessoa ainda nao tem horario fixo cadastrado.')
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
          toast.success(`${result.updated} sessoes atualizadas`)
        } else {
          await updateAppointment.mutateAsync({
            id: appointment.id,
            data: { ...data, duration, recurrence: 'none' } as any,
          })
          toast.success(appointment.isRecurring ? 'Alteracao pontual salva' : 'Sessao atualizada')
        }
      } else {
        const payload = {
          ...data,
          duration,
          recurrence: data.recurrence,
          repeatUntil: data.recurrence === 'none' ? undefined : data.repeatUntil || undefined,
        }
        const created = await createAppointment.mutateAsync(payload as any)
        toast.success(Array.isArray(created) ? `${created.length} sessoes agendadas` : 'Sessao agendada')
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
      title={isEditing ? 'Alterar atendimento' : 'Agendar nova sessao'}
      description={isEditing
        ? 'Escolha se a mudanca vale so para este atendimento ou para a serie.'
        : 'Crie um atendimento unico, semanal ou de 15 em 15 dias.'}
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
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-sage-100 bg-sage-50 px-3 py-3">
            <div className="flex items-start gap-2">
              <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-sage-600" />
              <div>
                <p className="text-xs font-medium text-sage-800">Horario fixo cadastrado</p>
                <p className="text-xs text-sage-700">{fixedLabel}</p>
              </div>
            </div>
            <button type="button" onClick={applyFixedSchedule} className="btn-secondary text-xs py-1.5 px-3 shrink-0">
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
              <label className="label">Recorrencia</label>
              <select {...register('recurrence')} className="input-field">
                <option value="none">Nao repetir</option>
                <option value="weekly">Toda semana</option>
                <option value="biweekly">De 15 em 15 dias</option>
              </select>
            </div>
            <div>
              <label className="label">Repetir ate</label>
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
          <div className="rounded-2xl border border-sage-200 bg-sage-50 px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sage-600">
                <Repeat2 className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-sage-900">Previsao da recorrencia</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <div className="rounded-xl bg-white px-3 py-2">
                    <p className="text-sage-500">Criara</p>
                    <p className="font-semibold text-sage-900">{sessionPreview.count} sessoes</p>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2">
                    <p className="text-sage-500">Frequencia</p>
                    <p className="font-semibold text-sage-900">{recurrence === 'weekly' ? 'Semanal' : '15 em 15 dias'}</p>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2">
                    <p className="text-sage-500">Inicio</p>
                    <p className="font-semibold text-sage-900">{format(parseISO(date), 'dd/MM/yyyy')}</p>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2">
                    <p className="text-sage-500">Ultima</p>
                    <p className="font-semibold text-sage-900">{format(sessionPreview.lastDate, 'dd/MM/yyyy')}</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-sage-700">
                  {time ? `Sempre as ${time}. ` : ''}
                  {!repeatUntil ? 'Como a data final nao foi informada, o sistema usa o limite padrao de 3 meses.' : 'A serie termina na data informada.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {isEditing && appointment?.isRecurring && (
          <div className="overflow-hidden rounded-2xl border border-neutral-200">
            <button
              type="button"
              onClick={() => setEditScope('single')}
              className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                editScope === 'single' ? 'bg-sage-50' : 'hover:bg-neutral-50'
              }`}
            >
              <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                editScope === 'single' ? 'border-sage-500 bg-sage-500' : 'border-neutral-300'
              }`}>
                {editScope === 'single' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
              <div>
                <p className="text-sm font-medium text-neutral-800">Alterar apenas esta sessao</p>
                <p className="text-xs text-neutral-400">As demais sessoes da serie nao serao afetadas. Esta vira uma alteracao pontual.</p>
              </div>
            </button>
            <div className="border-t border-neutral-100" />
            <button
              type="button"
              onClick={() => setEditScope('future')}
              className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                editScope === 'future' ? 'bg-sage-50' : 'hover:bg-neutral-50'
              }`}
            >
              <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                editScope === 'future' ? 'border-sage-500 bg-sage-500' : 'border-neutral-300'
              }`}>
                {editScope === 'future' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
              <div>
                <p className="text-sm font-medium text-neutral-800">Alterar esta e as proximas</p>
                <p className="text-xs text-neutral-400">Aplica horario, duracao e modalidade a todas as sessoes futuras desta serie.</p>
              </div>
            </button>
          </div>
        )}

        <div>
          <label className="label">Observacoes (opcional)</label>
          <textarea {...register('notes')} rows={2} className="input-field resize-none" placeholder="Alguma informacao relevante para esta sessao..." />
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
