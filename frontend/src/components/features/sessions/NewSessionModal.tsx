import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import Modal from '@/components/ui/Modal'
import toast from 'react-hot-toast'
import { EmotionalTag, TAG_LABELS } from '@/types'
import { cn, formatCurrency, formatDateRelative } from '@/lib/utils'
import { useAppointments, useCreateAppointment, usePatients, useCreateSession, useDefaultTemplate, useFinancial, useInstrumentAssignments, useSessions } from '@/hooks/useApi'
import UseCogniaIcon from '@/components/ui/UseCogniaIcon'
import DictationButton from '@/components/ui/DictationButton'
import RecordingPanel from '@/components/ui/RecordingPanel'
import { CalendarPlus, CheckCircle2, ChevronDown, ChevronUp, ClipboardList, Clock, Wallet } from 'lucide-react'

const MOODS = [
  { value: 1, label: 'Muito dificil' },
  { value: 2, label: 'Dificil' },
  { value: 3, label: 'Neutro' },
  { value: 4, label: 'Positivo' },
  { value: 5, label: 'Muito positivo' },
]

type NewSessionDefaults = {
  patientId?: string
  date?: string
  duration?: number
  appointmentId?: string
}

export default function NewSessionModal({ open, onClose, defaultPatientId, defaults }: {
  open: boolean
  onClose: () => void
  defaultPatientId?: string
  defaults?: NewSessionDefaults
}) {
  const [mood, setMood] = useState<number | null>(null)
  const [tags, setTags] = useState<EmotionalTag[]>([])
  const [showPreparation, setShowPreparation] = useState(true)
  const [scheduleFollowUp, setScheduleFollowUp] = useState(false)
  const [followUp, setFollowUp] = useState({ date: '', time: '', modality: 'presencial' as 'presencial' | 'online' })
  const { data: patients = [] } = usePatients()
  const { data: sessionTemplate } = useDefaultTemplate('session_note')
  const createSession = useCreateSession()
  const createAppointment = useCreateAppointment()

  const defaultValues = {
    patientId: defaults?.patientId ?? defaultPatientId ?? '',
    date: defaults?.date ?? new Date().toISOString().split('T')[0],
    duration: defaults?.duration ?? 50,
    appointmentId: defaults?.appointmentId ?? '',
    summary: '',
    privateNotes: '',
    nextSteps: '',
    paymentStatus: 'pending',
  }

  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting } } = useForm({ defaultValues })
  const selectedPatientId = watch('patientId')
  const selectedPatient = patients.find(patient => patient.id === selectedPatientId)
  const { data: patientSessions = [], isLoading: loadingPreparation } = useSessions({ patientId: selectedPatientId, includeClinical: true, enabled: open && !!selectedPatientId })
  const { data: patientFinancial = [] } = useFinancial(selectedPatientId ? { patientId: selectedPatientId } : undefined)
  const { data: instrumentAssignments = [] } = useInstrumentAssignments(selectedPatientId)
  const { data: patientAppointments = [] } = useAppointments({ patientId: selectedPatientId, enabled: open && !!selectedPatientId })

  const preparation = useMemo(() => {
    const previousSession = [...patientSessions]
      .filter(session => session.appointmentId !== defaults?.appointmentId)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))[0]
    const pendingPayments = patientFinancial.filter(record => record.type === 'income' && record.status !== 'paid')
    const pendingInstruments = instrumentAssignments.filter(item => item.status === 'pending')
    const today = new Date().toISOString().slice(0, 10)
    const nextAppointment = [...patientAppointments]
      .filter(item => item.status === 'scheduled' && item.id !== defaults?.appointmentId && item.date >= today)
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0]
    return { previousSession, pendingPayments, pendingInstruments, nextAppointment }
  }, [defaults?.appointmentId, instrumentAssignments, patientAppointments, patientFinancial, patientSessions])

  useEffect(() => {
    if (!open) return
    reset({
      patientId: defaults?.patientId ?? defaultPatientId ?? '',
      date: defaults?.date ?? new Date().toISOString().split('T')[0],
      duration: defaults?.duration ?? 50,
      appointmentId: defaults?.appointmentId ?? '',
      summary: '',
      privateNotes: '',
      nextSteps: '',
      paymentStatus: 'pending',
    })
    setMood(null)
    setTags([])
    setShowPreparation(true)
    setScheduleFollowUp(false)
    setFollowUp({ date: '', time: '', modality: 'presencial' })
  }, [defaultPatientId, defaults?.appointmentId, defaults?.date, defaults?.duration, defaults?.patientId, open, reset])

  useEffect(() => {
    if (!open || !selectedPatient) return
    setValue('paymentStatus', selectedPatient.billingType === 'monthly_package' ? 'included' : 'pending')
  }, [open, selectedPatient?.billingType, selectedPatient?.id, setValue])

  function toggleTag(tag: EmotionalTag) {
    setTags(t => t.includes(tag) ? t.filter(x => x !== tag) : [...t, tag])
  }

  function applyDefaultTemplate() {
    if (!sessionTemplate) return
    setValue('date', defaults?.date ?? new Date().toISOString().split('T')[0])
    setValue('duration', defaults?.duration ?? 50)
    setValue('summary', [
      'Presenca: ',
      'Modalidade: ',
      'Demanda/tema central: ',
      'Intervencoes realizadas: ',
      'Resposta do paciente: ',
      'Evolucao observada: ',
    ].join('\n'))
    setValue('privateNotes', [
      'Hipoteses de trabalho: ',
      'Pontos de atencao: ',
      'Riscos/sinais de alerta: ',
      'Observacoes para supervisao: ',
    ].join('\n'))
    setValue('nextSteps', 'Plano para a proxima sessao: ')
    toast.success('Modelo clínico aplicado')
  }

  async function onSubmit(data: any) {
    try {
      const payload = { ...data, appointmentId: data.appointmentId || undefined, mood, tags }
      await createSession.mutateAsync(payload)
      if (scheduleFollowUp && followUp.date && followUp.time) {
        try {
          await createAppointment.mutateAsync({
            patientId: data.patientId,
            date: followUp.date,
            time: followUp.time,
            duration: selectedPatient?.sessionDuration ?? (Number(data.duration) || 50),
            modality: followUp.modality,
            status: 'scheduled',
          })
          toast.success('Sessão registrada e retorno agendado')
        } catch {
          toast.error('A sessão foi salva, mas o horário do retorno não estava disponível')
        }
      } else {
        toast.success('Sessão registrada com cuidado')
      }
      reset(); setMood(null); setTags([]); onClose()
    } catch {
      toast.error('Erro ao salvar sessão. Tente novamente.')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Como foi a sessão?" size="lg"
      description="Registre o que achar relevante. A sessão entra automaticamente na evolução do prontuário e os dados são criptografados.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {sessionTemplate && (
          <button type="button" onClick={applyDefaultTemplate}
            className="rounded-full border border-sage-100 bg-sage-50 px-3 py-1 text-xs font-medium text-sage-700 hover:bg-sage-100">
            Usar template padrão
          </button>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Pessoa</label>
            <select {...register('patientId', { required: true })} className="input-field">
              <option value="">Selecione...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Data</label>
            <input {...register('date')} type="date" className="input-field" />
          </div>
        </div>

        {selectedPatientId && (
          <section className="overflow-hidden rounded-2xl border border-sage-100 bg-sage-50/60 dark:border-white/10 dark:bg-white/5">
            <button type="button" onClick={() => setShowPreparation(value => !value)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
              <span>
                <span className="block text-sm font-semibold text-sage-800 dark:text-sage-100">Preparação rápida</span>
                <span className="block text-xs text-sage-600 dark:text-sage-300">Contexto essencial antes de registrar a evolução</span>
              </span>
              {showPreparation ? <ChevronUp className="h-4 w-4 text-sage-600" /> : <ChevronDown className="h-4 w-4 text-sage-600" />}
            </button>
            {showPreparation && (
              <div className="border-t border-sage-100 px-4 py-4 dark:border-white/10">
                {loadingPreparation ? <p className="text-xs text-neutral-500">Carregando contexto...</p> : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-white p-3 dark:bg-white/5">
                      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-neutral-700 dark:text-neutral-100">
                        <ClipboardList className="h-4 w-4 text-sage-600" /> Última evolução
                      </div>
                      {preparation.previousSession ? (
                        <>
                          <p className="text-[11px] text-neutral-400">{formatDateRelative(preparation.previousSession.date)}</p>
                          <p className="mt-1 line-clamp-3 whitespace-pre-line text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
                            {preparation.previousSession.summary || 'Evolução registrada sem resumo.'}
                          </p>
                          {preparation.previousSession.nextSteps && (
                            <p className="mt-2 rounded-lg bg-sage-50 px-2 py-1.5 text-xs text-sage-800 dark:bg-white/5 dark:text-sage-100">
                              <strong>Combinado:</strong> {preparation.previousSession.nextSteps}
                            </p>
                          )}
                        </>
                      ) : <p className="text-xs text-neutral-500">Primeira evolução desta pessoa.</p>}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5 text-xs dark:bg-white/5">
                        <span className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300"><Wallet className="h-4 w-4 text-amber-500" /> Pendências</span>
                        <strong className="text-neutral-800 dark:text-white">{preparation.pendingPayments.length} · {formatCurrency(preparation.pendingPayments.reduce((sum, item) => sum + Number(item.amount), 0))}</strong>
                      </div>
                      <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5 text-xs dark:bg-white/5">
                        <span className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300"><CheckCircle2 className="h-4 w-4 text-mist-500" /> Instrumentos aguardando</span>
                        <strong className="text-neutral-800 dark:text-white">{preparation.pendingInstruments.length}</strong>
                      </div>
                      <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5 text-xs dark:bg-white/5">
                        <span className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300"><Clock className="h-4 w-4 text-sage-500" /> Próximo horário</span>
                        <strong className="text-right text-neutral-800 dark:text-white">
                          {preparation.nextAppointment ? `${formatDateRelative(preparation.nextAppointment.date)}, ${preparation.nextAppointment.time.slice(0, 5)}` : 'Não agendado'}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        <div>
          <label className="label">Como a pessoa chegou nesta sessão?</label>
          <div className="flex gap-2">
            {MOODS.map(m => (
              <button key={m.value} type="button" onClick={() => setMood(m.value)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all text-xs',
                  mood === m.value ? 'bg-sage-50 border-sage-300 text-sage-700' : 'border-neutral-200 text-neutral-500 hover:border-sage-200'
                )}>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-semibold text-sage-700 shadow-sm">
                  {m.value}
                </span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <label className="label mb-0">Resumo da sessão</label>
            <div className="flex items-center gap-2">
              <RecordingPanel
                patientName={patients.find(p => p.id === watch('patientId'))?.name}
                onApplyTranscription={text => setValue('privateNotes', (watch('privateNotes') ? watch('privateNotes') + '\n\n' : '') + text)}
                onApplySummary={text => setValue('summary', text)}
              />
              <DictationButton value={watch('summary') ?? ''} onChange={value => setValue('summary', value)} />
            </div>
          </div>
          <textarea {...register('summary')} rows={3} className="input-field resize-none"
            placeholder="O que foi trabalhado, pontos de atenção, avanços observados..." />
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-amber-700 flex items-center gap-1.5">
              <UseCogniaIcon name="security-lgpd" size={24} />
              Anotacoes privadas - apenas voce ve
            </p>
            <DictationButton value={watch('privateNotes') ?? ''} onChange={value => setValue('privateNotes', value)} />
          </div>
          <textarea {...register('privateNotes')} rows={2} className="input-field resize-none text-sm"
            placeholder="Percepções, hipóteses de trabalho, reflexões clínicas..." />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <label className="label mb-0">Próximos passos (opcional)</label>
            <DictationButton value={watch('nextSteps') ?? ''} onChange={value => setValue('nextSteps', value)} />
          </div>
          <input {...register('nextSteps')} className="input-field"
            placeholder="Tarefas, temas para a próxima sessão..." />
        </div>

        <div>
          <label className="label">Temas desta sessão</label>
          <div className="flex flex-wrap gap-1.5">
            {(Object.entries(TAG_LABELS) as [EmotionalTag, string][]).map(([tag, label]) => (
              <button key={tag} type="button" onClick={() => toggleTag(tag)}
                className={cn('px-3 py-1 rounded-full text-xs font-medium border transition-all', tags.includes(tag)
                  ? 'bg-sage-100 text-sage-700 border-sage-300' : 'bg-neutral-50 text-neutral-500 border-neutral-200 hover:border-sage-300')}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Pagamento</label>
          {selectedPatient?.billingType === 'monthly_package' ? (
            <div className="rounded-xl border border-mist-200 bg-mist-50 px-3 py-2.5 text-sm text-mist-800">
              Incluída no pacote mensal de {formatCurrency(Number(selectedPatient.monthlyPackagePrice ?? 0))}. Nenhuma cobrança avulsa será criada.
              <input {...register('paymentStatus')} type="hidden" value="included" />
            </div>
          ) : (
            <select {...register('paymentStatus')} className="input-field">
              <option value="paid">Recebido</option>
              <option value="pending">Pendente</option>
              <option value="waived">Cortesia</option>
            </select>
          )}
        </div>

        <section className="rounded-2xl border border-neutral-200 p-4 dark:border-white/10">
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-100">
              <CalendarPlus className="h-4 w-4 text-sage-600" /> Agendar o próximo encontro agora
            </span>
            <input type="checkbox" checked={scheduleFollowUp} onChange={event => setScheduleFollowUp(event.target.checked)} className="h-4 w-4 accent-sage-600" />
          </label>
          {scheduleFollowUp && (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <input type="date" value={followUp.date} min={new Date().toISOString().slice(0, 10)} required
                onChange={event => setFollowUp(value => ({ ...value, date: event.target.value }))} className="input-field" aria-label="Data do retorno" />
              <input type="time" value={followUp.time} required
                onChange={event => setFollowUp(value => ({ ...value, time: event.target.value }))} className="input-field" aria-label="Horário do retorno" />
              <select value={followUp.modality}
                onChange={event => setFollowUp(value => ({ ...value, modality: event.target.value as 'presencial' | 'online' }))} className="input-field" aria-label="Modalidade do retorno">
                <option value="presencial">Presencial</option>
                <option value="online">Online</option>
              </select>
            </div>
          )}
        </section>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={isSubmitting || createAppointment.isPending} className="btn-primary flex items-center gap-2">
            {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {scheduleFollowUp ? 'Salvar e agendar retorno' : 'Concluir sessão'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
