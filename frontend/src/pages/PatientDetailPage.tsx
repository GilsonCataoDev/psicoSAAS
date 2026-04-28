import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Phone, Mail, Calendar, Plus, Lock, ClipboardList, MessageCircle, CheckCircle2 } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import { TagBadge, StatusBadge } from '@/components/ui/Badge'
import { formatDate, formatCurrency, formatDateRelative } from '@/lib/utils'
import { useState } from 'react'
import { usePatient, useSessions, useFinancial, useMarkFinancialPaid, useSendCharge } from '@/hooks/useApi'
import NewSessionModal from '@/components/features/sessions/NewSessionModal'
import toast from 'react-hot-toast'

export default function PatientDetailPage() {
  const { id } = useParams()
  const { data: patient, isLoading } = usePatient(id ?? '')
  const { data: allSessions = [] } = useSessions({ patientId: id })
  const { data: financialRecords = [], isLoading: loadingFinancial } = useFinancial({ patientId: id })
  const markPaid = useMarkFinancialPaid()
  const sendCharge = useSendCharge()
  const [note, setNote] = useState('')
  const [tab, setTab] = useState<'timeline' | 'notes' | 'financial'>('timeline')
  const [showSessionModal, setShowSessionModal] = useState(false)

  async function handleMarkPaid(recordId: string) {
    try {
      await markPaid.mutateAsync({ id: recordId, method: 'PIX' })
      toast.success('Pagamento registrado ✓')
    } catch { toast.error('Erro ao registrar pagamento.') }
  }

  async function handleSendCharge(recordId: string) {
    try {
      await sendCharge.mutateAsync(recordId)
      toast.success('Cobrança enviada via WhatsApp ✓')
    } catch { toast.error('Erro ao enviar cobrança.') }
  }

  if (isLoading) return (
    <div className="animate-pulse space-y-4 max-w-4xl">
      <div className="h-6 bg-neutral-100 rounded w-32" />
      <div className="h-32 bg-neutral-100 rounded-2xl" />
    </div>
  )

  if (!patient) return (
    <div className="text-center py-20">
      <p className="text-neutral-500">Pessoa não encontrada.</p>
      <Link to="/pacientes" className="btn-secondary mt-4 inline-flex">Voltar</Link>
    </div>
  )

  const sessions = allSessions

  return (
    <div className="animate-slide-up space-y-6 max-w-4xl">
      <Link to="/pacientes"
        className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Voltar para Pessoas
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
                  {patient.pronouns && <span className="text-sm text-neutral-400">({patient.pronouns})</span>}
                  <StatusBadge status={patient.status} />
                </div>
                <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-neutral-500">
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
              {/* Action buttons — topo no desktop */}
              <div className="hidden sm:flex gap-2 shrink-0">
                <Link to={`/prontuario/${patient.id}`}
                  className="btn-secondary text-sm flex items-center gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5" />Prontuário
                </Link>
                <button onClick={() => setShowSessionModal(true)} className="btn-primary text-sm flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />Nova sessão
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {patient.tags.map(tag => <TagBadge key={tag} tag={tag} />)}
            </div>
          </div>
        </div>

        {/* Action buttons — mobile (abaixo do avatar/nome) */}
        <div className="flex gap-2 mt-4 sm:hidden">
          <Link to={`/prontuario/${patient.id}`}
            className="btn-secondary text-sm flex items-center gap-1.5 flex-1 justify-center">
            <ClipboardList className="w-3.5 h-3.5" />Prontuário
          </Link>
          <button onClick={() => setShowSessionModal(true)} className="btn-primary text-sm flex items-center gap-1.5 flex-1 justify-center">
            <Plus className="w-3.5 h-3.5" />Nova sessão
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5 pt-5 border-t border-neutral-100">
          <div>
            <p className="text-xs text-neutral-400">Em acompanhamento desde</p>
            <p className="font-medium text-neutral-700 mt-0.5 text-sm">{formatDate(patient.startDate)}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-400">Valor por sessão</p>
            <p className="font-medium text-neutral-700 mt-0.5 text-sm">{formatCurrency(patient.sessionPrice)}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-400">Duração</p>
            <p className="font-medium text-neutral-700 mt-0.5 text-sm">{patient.sessionDuration} min</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl">
        {(['timeline', 'notes', 'financial'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-sm transition-all text-center ${
              tab === t
                ? 'bg-white text-neutral-800 shadow-sm font-medium'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}>
            {t === 'timeline' ? 'Histórico' : t === 'notes' ? '🔒 Anotações' : 'Financeiro'}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {tab === 'timeline' && (
        <div className="space-y-3">
          {sessions.length === 0 ? (
            <div className="card text-center py-10 text-neutral-400 text-sm">
              Nenhuma sessão registrada ainda.
            </div>
          ) : (
            sessions.map(s => (
              <div key={s.id} className="card flex gap-4">
                <div className="w-12 text-center shrink-0">
                  <p className="text-xs text-neutral-400">{formatDateRelative(s.date)}</p>
                  <span className="text-lg">{s.mood ? ['','😔','😟','😐','🙂','😊'][s.mood] : '📝'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-neutral-700 text-sm">Sessão · {s.duration}min</p>
                  {s.summary && <p className="text-sm text-neutral-500 mt-1 line-clamp-2">{s.summary}</p>}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {s.tags.map(t => <TagBadge key={t} tag={t} small />)}
                  </div>
                </div>
                <StatusBadge status={s.paymentStatus} />
              </div>
            ))
          )}
        </div>
      )}

      {/* Notes */}
      {tab === 'notes' && (
        <div className="card space-y-4">
          <div className="flex items-center gap-2 text-sm text-neutral-500 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <Lock className="w-4 h-4 text-amber-500 shrink-0" />
            Anotações criptografadas — visíveis apenas para você.
          </div>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={8}
            placeholder="Escreva suas observações clínicas com liberdade. Ninguém mais terá acesso a este espaço..."
            className="input-field resize-none" />
          <div className="flex justify-end">
            <button className="btn-primary">Salvar anotação</button>
          </div>
        </div>
      )}

      {/* Financial */}
      {tab === 'financial' && (
        <div className="space-y-3">
          {/* Resumo */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total',    value: financialRecords.reduce((s, r) => s + Number(r.amount), 0), color: 'text-neutral-700' },
              { label: 'Recebido', value: financialRecords.filter(r => r.status === 'paid').reduce((s, r) => s + Number(r.amount), 0), color: 'text-sage-700' },
              { label: 'Pendente', value: financialRecords.filter(r => r.status === 'pending').reduce((s, r) => s + Number(r.amount), 0), color: 'text-amber-600' },
            ].map(item => (
              <div key={item.label} className="card py-3 text-center">
                <p className={`text-lg font-bold ${item.color}`}>{formatCurrency(item.value)}</p>
                <p className="text-xs text-neutral-400 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>

          {/* Lista */}
          {loadingFinancial ? (
            <div className="card text-center py-8">
              <div className="w-6 h-6 border-2 border-sage-400 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : financialRecords.length === 0 ? (
            <div className="card text-center py-10 text-neutral-400 text-sm">
              Nenhum registro financeiro ainda.
            </div>
          ) : (
            financialRecords.map(record => (
              <div key={record.id} className="card flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-700">{record.description}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {record.dueDate ? formatDate(record.dueDate) : '—'}
                    {record.method && <span> · {record.method}</span>}
                  </p>
                </div>
                <p className="font-semibold text-neutral-700 shrink-0">{formatCurrency(Number(record.amount))}</p>
                <div className="flex items-center gap-2 shrink-0">
                  {record.status === 'paid' ? (
                    <span className="flex items-center gap-1 text-xs text-sage-600 bg-sage-50 px-2 py-1 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />Pago
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => handleSendCharge(record.id)}
                        title="Enviar cobrança via WhatsApp"
                        className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMarkPaid(record.id)}
                        className="text-xs btn-secondary py-1 px-2"
                      >
                        Recebido
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <NewSessionModal
        open={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        defaultPatientId={patient.id}
      />
    </div>
  )
}
