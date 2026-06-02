import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import Modal from '@/components/ui/Modal'
import toast from 'react-hot-toast'
import { addDays, format } from 'date-fns'
import { usePatients, useCreateAppointment, useUpdateAppointment } from '@/hooks/useApi'
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
  const isEditing = Boolean(appointment)

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
  const selectedPatient = patients.find(p => p.id === patientId)
  const fixedLabel = fixedScheduleLabel(selectedPatient)

  useEffect(() => {
    if (!open) return
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
      const payload = {
        ...data,
        duration: Number(data.duration),
        recurrence: isEditing ? 'none' : data.recurrence,
        repeatUntil: data.recurrence === 'none' ? undefined : data.repeatUntil || undefined,
      }
      if (isEditing && appointment) {
        await updateAppointment.mutateAsync({ id: appointment.id, data: payload as any })
        toast.success('Ocorrencia atualizada')
      } else {
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
      title={isEditing ? 'Alterar esta ocorrencia' : 'Agendar nova sessao'}
      description={isEditing
        ? 'A mudanca vale apenas para este atendimento.'
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
            <input {...register('date', { required: true })} type="date" className="input-field" />
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

        {isEditing && appointment?.isRecurring && (
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Este atendimento faz parte de uma recorrencia. A alteracao sera pontual e nao muda os demais horarios.
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
            disabled={isSubmitting || createAppointment.isPending || updateAppointment.isPending}
            className="btn-primary flex items-center gap-2"
          >
            {(isSubmitting || createAppointment.isPending || updateAppointment.isPending) && (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {isEditing ? 'Salvar alteracao' : 'Agendar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
