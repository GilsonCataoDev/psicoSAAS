import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Phone, Mail, Calendar, Plus, Lock,
  ClipboardList, MessageCircle, CheckCircle2, Save,
  CalendarDays, Banknote, Clock, FileText, Pencil,
} from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import { TagBadge, StatusBadge } from '@/components/ui/Badge'
import { formatDate, formatCurrency, formatDateRelative } from '@/lib/utils'
import { useState, useEffect } from 'react'
import {
  usePatient, useSessions, useFinancial,
  useMarkFinancialPaid, useSendCharge, useUpdatePatient,
  useInstrumentAssignments, useUpdateInstrumentAnswers, type InstrumentAssignment,
} from '@/hooks/useApi'
import NewSessionModal from '@/components/features/sessions/NewSessionModal'
import Modal from '@/components/ui/Modal'
import toast from 'react-hot-toast'

const MOODS = ['', '1', '2', '3', '4', '5']
const WEEKDAYS = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado']

export default function PatientDetailPage() {
  const { id } = useParams()
  const { data: patient, isLoading } = usePatient(id ?? '')
  const { data: allSessions = [] } = useSessions({ patientId: id })
  const { data: financialRecords = [], isLoading: loadingFinancial } = useFinancial({ patientId: id })
  const markPaid = useMarkFinancialPaid()
  const sendCharge = useSendCharge()
  const updatePatient = useUpdatePatient()
  const { data: instrumentAssignments = [] } = useInstrumentAssignments(id)
  const updateInstrumentAnswers = useUpdateInstrumentAnswers()
  const [note, setNote] = useState('')
  const [tab, setTab] = useState<'timeline' | 'responses' | 'notes' | 'financial'>('timeline')
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [editingResponse, setEditingResponse] = useState<InstrumentAssignment | null>(null)
  const [editedAnswers, setEditedAnswers] = useState<Record<string, string>>({})
  const [fixedSchedule, setFixedSchedule] = useState({
    hasFixedSchedule: false,
    fixedScheduleWeekday: 1,
    fixedScheduleTime: '09:00',
    fixedScheduleFrequency: 'weekly' as 'weekly' | 'biweekly',
    fixedScheduleModality: 'presencial' as 'presencial' | 'online',
  })

  useEffect(() => {
    if (patient?.privateNotes) setNote(patient.privateNotes)
  }, [patient?.id])

  useEffect(() => {
    if (!patient) return
    setFixedSchedule({
      hasFixedSchedule: Boolean(patient.hasFixedSchedule),
      fixedScheduleWeekday: patient.fixedScheduleWeekday ?? 1,
      fixedScheduleTime: patient.fixedScheduleTime ?? '09:00',
      fixedScheduleFrequency: patient.fixedScheduleFrequency ?? 'weekly',
      fixedScheduleModality: patient.fixedScheduleModality ?? 'presencial',
    })
  }, [patient?.id, patient?.hasFixedSchedule, patient?.fixedScheduleWeekday, patient?.fixedScheduleTime, patient?.fixedScheduleFrequency, patient?.fixedScheduleModality])

  async function handleMarkPaid(recordId: string) {
    try {
      await markPaid.mutateAsync({ id: recordId, method: 'PIX' })
      toast.success('Pagamento registrado')
    } catch { toast.error('Erro ao registrar pagamento.') }
  }

  async function handleSendCharge(recordId: string) {
    try {
      await sendCharge.mutateAsync(recordId)
      toast.success('Cobranca enviada via WhatsApp')
    } catch { toast.error('Erro ao enviar cobrança.') }
  }

  async function saveFixedSchedule() {
    if (!id) return
    try {
      await updatePatient.mutateAsync({ id, data: fixedSchedule })
      toast.success('Horario fixo salvo')
    } catch {
      toast.error('Erro ao salvar horario fixo.')
    }
  }

  function openResponse(response: InstrumentAssignment) {
    setEditingResponse(response)
    setEditedAnswers(response.answers ?? {})
  }

  async function saveResponse() {
    if (!editingResponse) return
    try {
      await updateInstrumentAnswers.mutateAsync({ id: editingResponse.id, answers: editedAnswers })
      setEditingResponse(null)
      toast.success('Respostas atualizadas')
    } catch {
      toast.error('Erro ao atualizar respostas.')
    }
  }

  if (isLoading) return (
    <div className="animate-pulse space-y-4 max-w-4xl">
      <div className="h-5 bg-neutral-100 rounded-lg w-36" />
      <div className="h-36 bg-neutral-100 rounded-2xl" />
      <div className="h-10 bg-neutral-100 rounded-xl" />
    </div>
  )

  if (!patient) return (
    <div className="text-center py-20">
      <p className="text-neutral-500 mb-4">Pessoa não encontrada.</p>
      <Link to="/pacientes" className="btn-secondary inline-flex">← Voltar</Link>
    </div>
  )

  const totalPaid    = financialRecords.filter(r => r.status === 'paid').reduce((s, r) => s + Number(r.amount), 0)
  const totalPending = financialRecords.filter(r => r.status !== 'paid').reduce((s, r) => s + Number(r.amount), 0)
  const clinicalSessions = allSessions.filter(session => !session.tags?.some(tag => String(tag) === 'instrumento'))

  return (
    <div className="animate-slide-up space-y-5 max-w-4xl">
      {/* Voltar */}
      <Link to="/pacientes"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-700 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        <span>Pacientes</span>
      </Link>

      {/* Header card */}
      <div className="card">
        <div className="flex items-start gap-4">
          <Avatar name={patient.name} colorClass={patient.avatarColor} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-display text-xl font-medium text-neutral-800">{patient.name}</h1>
                  {patient.pronouns && (
                    <span className="text-sm text-neutral-400">({patient.pronouns})</span>
                  )}
                  <StatusBadge status={patient.status} />
                </div>
                <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-neutral-400">
                  {patient.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      <span className="truncate max-w-[160px]">{patient.email}</span>
                    </span>
                  )}
                  {patient.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />{patient.phone}
                    </span>
                  )}
                  {patient.birthDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />{formatDate(patient.birthDate)}
                    </span>
                  )}
                </div>
              </div>

              {/* Ações — desktop */}
              <div className="hidden sm:flex gap-2 shrink-0">
                <Link to={`/prontuario/${patient.id}`}
                  className="btn-secondary text-sm flex items-center gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5" /> Prontuário
                </Link>
                <button onClick={() => setShowSessionModal(true)}
                  className="btn-primary text-sm flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Nova sessão
                </button>
              </div>
            </div>

            {patient.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {patient.tags.map(tag => <TagBadge key={tag} tag={tag} />)}
              </div>
            )}
          </div>
        </div>

        {/* Ações — mobile */}
        <div className="flex gap-2 mt-4 sm:hidden">
          <Link to={`/prontuario/${patient.id}`}
            className="btn-secondary text-sm flex items-center gap-1.5 flex-1 justify-center">
            <ClipboardList className="w-3.5 h-3.5" /> Prontuário
          </Link>
          <button onClick={() => setShowSessionModal(true)}
            className="btn-primary text-sm flex items-center gap-1.5 flex-1 justify-center">
            <Plus className="w-3.5 h-3.5" /> Nova sessão
          </button>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5 pt-5 border-t border-neutral-100">
          <div>
            <p className="text-xs text-neutral-400 mb-0.5">Em acompanhamento desde</p>
            <p className="font-semibold text-neutral-700 text-sm">{formatDate(patient.startDate)}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-400 mb-0.5">Valor por sessão</p>
            <p className="font-semibold text-neutral-700 text-sm">{formatCurrency(patient.sessionPrice)}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-400 mb-0.5">Duração</p>
            <p className="font-semibold text-neutral-700 text-sm">{patient.sessionDuration} min</p>
          </div>
        </div>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-sage-600" />
            <h2 className="font-semibold text-neutral-800 text-sm">Horario fixo</h2>
          </div>
          <label className="flex items-center gap-2 text-xs text-neutral-500">
            <input
              type="checkbox"
              checked={fixedSchedule.hasFixedSchedule}
              onChange={e => setFixedSchedule(s => ({ ...s, hasFixedSchedule: e.target.checked }))}
              className="w-4 h-4 accent-sage-600"
            />
            Usar horario fixo
          </label>
        </div>
        {fixedSchedule.hasFixedSchedule && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <label className="label">Dia</label>
              <select
                value={fixedSchedule.fixedScheduleWeekday}
                onChange={e => setFixedSchedule(s => ({ ...s, fixedScheduleWeekday: Number(e.target.value) }))}
                className="input-field"
              >
                {WEEKDAYS.map((day, index) => <option key={day} value={index}>{day}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Horario</label>
              <input
                type="time"
                value={fixedSchedule.fixedScheduleTime}
                onChange={e => setFixedSchedule(s => ({ ...s, fixedScheduleTime: e.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Recorrencia</label>
              <select
                value={fixedSchedule.fixedScheduleFrequency}
                onChange={e => setFixedSchedule(s => ({ ...s, fixedScheduleFrequency: e.target.value as 'weekly' | 'biweekly' }))}
                className="input-field"
              >
                <option value="weekly">Toda semana</option>
                <option value="biweekly">15 em 15 dias</option>
              </select>
            </div>
            <div>
              <label className="label">Modalidade</label>
              <select
                value={fixedSchedule.fixedScheduleModality}
                onChange={e => setFixedSchedule(s => ({ ...s, fixedScheduleModality: e.target.value as 'presencial' | 'online' }))}
                className="input-field"
              >
                <option value="presencial">Presencial</option>
                <option value="online">Online</option>
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={saveFixedSchedule} disabled={updatePatient.isPending} className="btn-primary text-sm w-full">
                Salvar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl">
        {[
          { id: 'timeline',  label: 'Histórico',    icon: CalendarDays  },
          { id: 'responses', label: 'Respostas',    icon: FileText      },
          { id: 'notes',     label: 'Anotacoes privadas', icon: Lock          },
          { id: 'financial', label: 'Financeiro',   icon: Banknote      },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-sm transition-all text-center ${
              tab === t.id
                ? 'bg-white text-neutral-800 shadow-sm font-semibold'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Timeline ──────────────────────────────────────────────────── */}
      {tab === 'timeline' && (
        <div className="space-y-3">
          {clinicalSessions.length === 0 ? (
            <div className="card py-12 text-center">
              <div className="w-12 h-12 bg-sage-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <CalendarDays className="w-5 h-5 text-sage-400" />
              </div>
              <p className="font-medium text-neutral-600 mb-1">Nenhuma sessão ainda</p>
              <p className="text-sm text-neutral-400 mb-4">O histórico de sessões aparecerá aqui.</p>
              <button onClick={() => setShowSessionModal(true)} className="btn-secondary text-sm">
                Registrar sessão
              </button>
            </div>
          ) : (
            clinicalSessions.map(s => (
              <div key={s.id} className="card flex gap-4 hover:shadow-lifted transition-shadow duration-200">
                <div className="w-12 text-center shrink-0 pt-0.5">
                  <p className="text-[11px] text-neutral-400 leading-tight">{formatDateRelative(s.date)}</p>
                  <span className="text-xl mt-1 block">
                    {s.mood ? MOODS[s.mood] : 'Registro'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-neutral-700 text-sm">Sessão · {s.duration} min</p>
                  {s.summary && (
                    <p className="text-sm text-neutral-500 mt-1 line-clamp-2 leading-relaxed">{s.summary}</p>
                  )}
                  {s.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {s.tags.map(t => <TagBadge key={t} tag={t} small />)}
                    </div>
                  )}
                </div>
                <div className="shrink-0">
                  <StatusBadge status={s.paymentStatus} />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Respostas de formulários ─────────────────────────────────── */}
      {tab === 'responses' && (
        <div className="space-y-3">
          {instrumentAssignments.filter(item => item.status === 'completed').length === 0 ? (
            <div className="card py-12 text-center">
              <FileText className="mx-auto h-9 w-9 text-neutral-300" />
              <p className="mt-3 font-medium text-neutral-600">Nenhuma resposta recebida</p>
              <p className="mt-1 text-sm text-neutral-400">Formulários respondidos aparecerão aqui.</p>
            </div>
          ) : instrumentAssignments.filter(item => item.status === 'completed').map(response => (
            <button key={response.id} type="button" onClick={() => openResponse(response)}
              className="card w-full text-left hover:shadow-lifted transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-neutral-700">{response.title}</p>
                  <p className="mt-1 text-xs text-neutral-400">
                    Respondido em {response.completedAt ? formatDate(response.completedAt) : formatDate(response.createdAt)}
                  </p>
                  <p className="mt-3 text-sm text-neutral-500">
                    {response.answers
                      ? `${Object.values(response.answers).filter(Boolean).length} respostas preenchidas`
                      : 'Resposta em formato anterior'}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-sage-600">
                  <Pencil className="h-3.5 w-3.5" /> Ver e editar
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Anotações privadas ─────────────────────────────────────────── */}
      {tab === 'notes' && (
        <div className="card space-y-4">
          <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <Lock className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-800">
              Anotações criptografadas — visíveis apenas para você.
            </p>
          </div>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={9}
            placeholder="Escreva suas observações clínicas com liberdade. Este é um espaço só seu — ninguém mais terá acesso..."
            className="input-field resize-none leading-relaxed"
          />
          <div className="flex justify-end">
            <button
              onClick={async () => {
                if (!id) return
                try {
                  await updatePatient.mutateAsync({ id, data: { privateNotes: note } })
                  toast.success('Anotacao salva com seguranca')
                } catch { toast.error('Erro ao salvar anotação.') }
              }}
              disabled={updatePatient.isPending}
              className="btn-primary flex items-center gap-2"
            >
              <Save className="w-3.5 h-3.5" />
              {updatePatient.isPending ? 'Salvando...' : 'Salvar anotação'}
            </button>
          </div>
        </div>
      )}

      {/* ── Financeiro ────────────────────────────────────────────────── */}
      {tab === 'financial' && (
        <div className="space-y-3">
          {/* Resumo */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total cobrado', value: financialRecords.reduce((s, r) => s + Number(r.amount), 0), color: 'text-neutral-700' },
              { label: 'Recebido',      value: totalPaid,    color: 'text-sage-700'    },
              { label: 'Pendente',      value: totalPending, color: 'text-amber-600'   },
            ].map(item => (
              <div key={item.label} className="card py-4 text-center">
                <p className={`text-lg font-bold ${item.color}`}>{formatCurrency(item.value)}</p>
                <p className="text-xs text-neutral-400 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>

          {/* Lista */}
          {loadingFinancial ? (
            <div className="card text-center py-10">
              <div className="w-6 h-6 border-2 border-sage-400 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : financialRecords.length === 0 ? (
            <div className="card py-12 text-center">
              <div className="w-12 h-12 bg-sage-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Banknote className="w-5 h-5 text-sage-400" />
              </div>
              <p className="font-medium text-neutral-600 mb-1">Nenhum registro financeiro</p>
              <p className="text-sm text-neutral-400">Os lançamentos vinculados a esta pessoa aparecerão aqui.</p>
            </div>
          ) : (
            <div className="card divide-y divide-neutral-50">
              {financialRecords.map(record => (
                <div key={record.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-700">{record.description}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {record.dueDate ? formatDate(record.dueDate) : '—'}
                      {record.method && <span> · {record.method}</span>}
                    </p>
                  </div>
                  <p className="font-semibold text-neutral-700 text-sm shrink-0">
                    {formatCurrency(Number(record.amount))}
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    {record.status === 'paid' ? (
                      <span className="flex items-center gap-1 text-xs text-sage-600 bg-sage-50 px-2.5 py-1 rounded-full font-medium">
                        <CheckCircle2 className="w-3 h-3" /> Pago
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleSendCharge(record.id)}
                          title="Enviar cobrança via WhatsApp"
                          className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-sage-600 transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleMarkPaid(record.id)}
                          className="text-xs btn-secondary py-1 px-2.5"
                        >
                          Recebido
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <NewSessionModal
        open={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        defaultPatientId={patient.id}
      />

      <Modal open={!!editingResponse} onClose={() => setEditingResponse(null)} title={editingResponse?.title ?? 'Respostas'} size="lg">
        {editingResponse?.answers ? (
          <div className="space-y-4">
            {editingResponse.fields.map(field => (
              <label key={field.id} className="block">
                <span className="label">{field.label}</span>
                {field.type === 'textarea' ? (
                  <textarea rows={3} value={editedAnswers[field.id] ?? ''}
                    onChange={e => setEditedAnswers(prev => ({ ...prev, [field.id]: e.target.value }))}
                    className="input-field resize-y" />
                ) : field.type === 'select' ? (
                  <select value={editedAnswers[field.id] ?? ''}
                    onChange={e => setEditedAnswers(prev => ({ ...prev, [field.id]: e.target.value }))}
                    className="input-field">
                    <option value="">Selecione</option>
                    {field.options?.map(option => <option key={option} value={option}>{option}</option>)}
                  </select>
                ) : (
                  <input type={field.type} value={editedAnswers[field.id] ?? ''}
                    onChange={e => setEditedAnswers(prev => ({ ...prev, [field.id]: e.target.value }))}
                    className="input-field" />
                )}
              </label>
            ))}
            <div className="flex justify-end gap-3 border-t border-neutral-100 pt-4">
              <button type="button" onClick={() => setEditingResponse(null)} className="btn-secondary">Cancelar</button>
              <button type="button" onClick={saveResponse} disabled={updateInstrumentAnswers.isPending} className="btn-primary">
                {updateInstrumentAnswers.isPending ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        ) : (
          <pre className="whitespace-pre-wrap rounded-xl bg-neutral-50 p-4 text-sm leading-relaxed text-neutral-600">
            {editingResponse?.responseText}
          </pre>
        )}
      </Modal>
    </div>
  )
}
