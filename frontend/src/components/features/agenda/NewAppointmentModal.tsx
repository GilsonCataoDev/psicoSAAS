import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { format, parseISO } from 'date-fns'
import { AlertTriangle, CalendarClock, Repeat2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import toast from 'react-hot-toast'
import { usePatients, useAppointments, useCreateAppointment, useUpdateAppointment, useUpdateAppointmentGroup } from '@/hooks/useApi'
import { Appointment } from '@/types'
import { calcSessionPreview, fixedScheduleLabel, nextOccurrenceFromAnchor } from '@/lib/recurringSchedule'

type FormData = {
  patientId: string
  date: string
  time: string
  duration: number
  modality: 'presencial' | 'online'
  meetingUrl: string
  autoVideoRoom: boolean
  notes: string
  recurrence: 'none' | 'weekly' | 'biweekly'
  repeatUntil: string
}

type Props = {
  open: boolean
  onClose: () => void
  appointment?: Appointment | null
  initialValues?: Partial<FormData>
}

function nextDateForWeekday(weekday: number): string {
  return nextOccurrenceFromAnchor(null, weekday, 'weekly')
}

function timeToMinutes(time?: string): number {
  if (!time) return 0
  const [hours, minutes] = time.slice(0, 5).split(':').map(Number)
  return (hours * 60) + (minutes || 0)
}

function buildAppointmentUpdatePayload(data: FormData) {
  return {
    date: data.date,
    time: data.time,
    duration: Number(data.duration),
    modality: data.modality,
    meetingUrl: data.meetingUrl || undefined,
    autoVideoRoom: data.autoVideoRoom,
    notes: data.notes || undefined,
  }
}

export default function NewAppointmentModal({ open, onClose, appointment, initialValues }: Props) {
  const { data: patients = [] } = usePatients()
  const [editScope, setEditScope] = useState<'single' | 'future'>('single')
  const createAppointment = useCreateAppointment()
  const updateAppointment = useUpdateAppointment()
  const updateGroup = useUpdateAppointmentGroup()
  const isEditing = Boolean(appointment)

  const { register, handleSubmit, reset, watch, setValue, formState: { isSubmitting } } = useForm<FormData>({
    defaultValues: {
      patientId: '',
      date: '',
      time: '09:00',
      duration: 50,
      modality: 'presencial',
      meetingUrl: '',
      autoVideoRoom: true,
      notes: '',
      recurrence: 'none',
      repeatUntil: '',
    },
  })

  const patientId = watch('patientId')
  const recurrence = watch('recurrence')
  const date = watch('date')
  const time = watch('time')
  const duration = Number(watch('duration') || 50)
  const repeatUntil = watch('repeatUntil')
  const modality = watch('modality')
  const autoVideoRoom = watch('autoVideoRoom')
  const selectedPatient = patients.find(p => p.id === patientId)
  const fixedLabel = fixedScheduleLabel(selectedPatient)
  const { data: dayAppointments = [] } = useAppointments({
    from: date,
    to: date,
    enabled: open && !!date,
  })

  const sessionPreview =
    !isEditing && recurrence !== 'none'
      ? calcSessionPreview(date, recurrence, repeatUntil)
      : null

  const scheduleConflict = useMemo(() => {
    if (!date || !time) return null
    const start = timeToMinutes(time)
    const end = start + duration
    return dayAppointments.find(appt => {
      if (appt.id === appointment?.id) return false
      if (appt.status === 'cancelled' || appt.status === 'no_show') return false
      const otherStart = timeToMinutes(appt.time)
      const otherEnd = otherStart + Number(appt.duration || 50)
      return otherStart < end && otherEnd > start
    }) ?? null
  }, [appointment?.id, date, dayAppointments, duration, time])

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
        meetingUrl: appointment.meetingUrl ?? '',
        autoVideoRoom: true,
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
      meetingUrl: '',
      autoVideoRoom: true,
      notes: '',
      recurrence: 'none',
      repeatUntil: '',
      ...initialValues,
    })
  }, [open, appointment, reset, initialValues])

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
    if (data.modality === 'online' && !data.autoVideoRoom && !data.meetingUrl?.trim()) {
      toast.error('Cole o link da chamada ou ative a sala automática.')
      return
    }
    try {
      const duration = Number(data.duration)
      if (isEditing && appointment) {
        const updatePayload = buildAppointmentUpdatePayload(data)
        if (editScope === 'future' && appointment.recurringGroupId) {
          const result = await updateGroup.mutateAsync({
            groupId: appointment.recurringGroupId,
            fromDate: appointment.date,
            data: {
              time: updatePayload.time,
              duration: updatePayload.duration,
              modality: updatePayload.modality,
              meetingUrl: updatePayload.meetingUrl,
              autoVideoRoom: updatePayload.autoVideoRoom,
              notes: updatePayload.notes,
            },
          })
          toast.success(`${result.updated} sessões atualizadas`)
        } else {
          await updateAppointment.mutateAsync({
            id: appointment.id,
            data: updatePayload,
          })
          toast.success(appointment.isRecurring ? 'Alteração pontual salva' : 'Sessão atualizada')
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
      title={isEditing ? 'Alterar atendimento' : 'Agendar nova sessão'}
      description={isEditing
        ? 'Escolha se a mudança vale só para este atendimento ou para a série.'
        : 'Crie um atendimento único, semanal ou de 15 em 15 dias.'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Pessoa</label>
          <select {...register('patientId', { required: !isEditing })} className="input-field" disabled={isEditing}>
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
          <div className="rounded-2xl border border-sage-200 bg-sage-50 px-4 py-3 dark:border-sage-400/30 dark:bg-sage-500/15">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sage-600">
                <Repeat2 className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-sage-900 dark:text-sage-100">Previsão da recorrência</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <div className="rounded-xl bg-white px-3 py-2 dark:bg-white/5">
                    <p className="text-sage-500 dark:text-sage-300">Criará</p>
                    <p className="font-semibold text-sage-900 dark:text-white">{sessionPreview.count} sessões</p>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2 dark:bg-white/5">
                    <p className="text-sage-500 dark:text-sage-300">Frequência</p>
                    <p className="font-semibold text-sage-900 dark:text-white">{recurrence === 'weekly' ? 'Semanal' : '15 em 15 dias'}</p>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2 dark:bg-white/5">
                    <p className="text-sage-500 dark:text-sage-300">Início</p>
                    <p className="font-semibold text-sage-900 dark:text-white">{format(parseISO(date), 'dd/MM/yyyy')}</p>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2 dark:bg-white/5">
                    <p className="text-sage-500 dark:text-sage-300">Última</p>
                    <p className="font-semibold text-sage-900 dark:text-white">{format(sessionPreview.lastDate, 'dd/MM/yyyy')}</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-sage-700 dark:text-sage-200">
                  {time ? `Sempre as ${time}. ` : ''}
                  {!repeatUntil ? 'Como a data final nao foi informada, o sistema usa o limite padrao de 3 meses.' : 'A serie termina na data informada.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {scheduleConflict && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-400/30 dark:bg-amber-500/15">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Horário em conflito</p>
                <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-100/80">
                  Já existe atendimento para {scheduleConflict.patient?.name ?? 'outro paciente'} às {scheduleConflict.time?.slice(0, 5)}. Escolha outro horário para salvar.
                </p>
              </div>
            </div>
          </div>
        )}

        {isEditing && appointment?.isRecurring && (
          <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-white/10">
            <button
              type="button"
              onClick={() => setEditScope('single')}
              className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                editScope === 'single' ? 'bg-sage-50 dark:bg-sage-500/15' : 'hover:bg-neutral-50 dark:hover:bg-white/5'
              }`}
            >
              <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                editScope === 'single' ? 'border-sage-500 bg-sage-500' : 'border-neutral-300'
              }`}>
                {editScope === 'single' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
              <div>
                <p className="text-sm font-medium text-neutral-800 dark:text-white">Alterar apenas esta sessão</p>
                <p className="text-xs text-neutral-400 dark:text-neutral-300">As demais sessões da série não serão afetadas. Esta vira uma alteração pontual.</p>
              </div>
            </button>
            <div className="border-t border-neutral-100" />
            <button
              type="button"
              onClick={() => setEditScope('future')}
              className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                editScope === 'future' ? 'bg-sage-50 dark:bg-sage-500/15' : 'hover:bg-neutral-50 dark:hover:bg-white/5'
              }`}
            >
              <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                editScope === 'future' ? 'border-sage-500 bg-sage-500' : 'border-neutral-300'
              }`}>
                {editScope === 'future' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
              <div>
                <p className="text-sm font-medium text-neutral-800 dark:text-white">Alterar esta e as próximas</p>
                <p className="text-xs text-neutral-400 dark:text-neutral-300">Aplica horário, duração e modalidade a todas as sessões futuras desta série.</p>
              </div>
            </button>
          </div>
        )}

        {modality === 'online' && (
          <div className="rounded-2xl border border-mist-100 bg-mist-50 px-4 py-3">
            <p className="text-sm font-semibold text-mist-900">Teleatendimento</p>
            <p className="mt-1 text-xs leading-relaxed text-mist-700">
              {autoVideoRoom
                ? 'Uma sala de vídeo é gerada automaticamente pra esta sessão. Se preferir usar Google Meet, Zoom ou Whereby, cole o link no campo abaixo.'
                : 'Sala automática desativada. Cole abaixo o link da chamada (Google Meet, Zoom, Whereby etc.).'}
            </p>
            <label className="mt-3 flex items-center gap-2 text-xs font-medium text-mist-800">
              <input type="checkbox" {...register('autoVideoRoom')} className="h-4 w-4 rounded border-mist-300" />
              Gerar sala automática (Jitsi) se eu não colar um link
            </label>
          </div>
        )}

        <div>
          {modality === 'online' && (
            <div className="mb-4">
              <label className="label">Link da chamada {autoVideoRoom ? '(opcional)' : ''}</label>
              <input
                {...register('meetingUrl')}
                type="url"
                inputMode="url"
                className="input-field"
                placeholder={autoVideoRoom ? 'Deixe em branco para gerar uma sala automaticamente' : 'Cole o link da chamada'}
              />
            </div>
          )}

          <label className="label">Observacoes (opcional)</label>
          <textarea
            {...register('notes')}
            rows={2}
            className="input-field resize-none"
            placeholder="Alguma informacao relevante para esta sessao..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button
            type="submit"
            disabled={!!scheduleConflict || isSubmitting || createAppointment.isPending || updateAppointment.isPending || updateGroup.isPending}
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
