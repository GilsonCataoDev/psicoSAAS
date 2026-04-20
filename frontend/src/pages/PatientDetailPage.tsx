import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Phone, Mail, Calendar, Edit2, Plus, Lock } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import { TagBadge, StatusBadge } from '@/components/ui/Badge'
import { mockPatients, mockSessions, mockAppointments } from '@/lib/mock-data'
import { formatDate, formatCurrency, formatDateRelative } from '@/lib/utils'
import { useState } from 'react'

export default function PatientDetailPage() {
  const { id } = useParams()
  const patient = mockPatients.find(p => p.id === id)
  const [note, setNote] = useState('')
  const [tab, setTab] = useState<'timeline' | 'notes' | 'financial'>('timeline')

  if (!patient) return (
    <div className="text-center py-20">
      <p className="text-neutral-500">Pessoa não encontrada.</p>
      <Link to="/pacientes" className="btn-secondary mt-4 inline-flex">Voltar</Link>
    </div>
  )

  const sessions = mockSessions.filter(s => s.patientId === id)
  const appointments = mockAppointments.filter(a => a.patientId === id)

  return (
    <div className="animate-slide-up space-y-6 max-w-4xl">
      <Link to="/pacientes" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Voltar para Pessoas
      </Link>

      {/* Header card */}
      <div className="card">
        <div className="flex items-start gap-5">
          <Avatar name={patient.name} colorClass={patient.avatarColor} size="lg" />
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-display text-2xl font-medium text-neutral-800">{patient.name}</h1>
              {patient.pronouns && <span className="text-sm text-neutral-400">({patient.pronouns})</span>}
              <StatusBadge status={patient.status} />
            </div>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-neutral-500">
              {patient.email && <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{patient.email}</span>}
              {patient.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{patient.phone}</span>}
              {patient.birthDate && <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{formatDate(patient.birthDate)}</span>}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {patient.tags.map(tag => <TagBadge key={tag} tag={tag} />)}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button className="btn-secondary text-sm flex items-center gap-1.5"><Edit2 className="w-3.5 h-3.5" />Editar</button>
            <button className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" />Nova sessão</button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-neutral-100">
          <div><p className="text-xs text-neutral-400">Em acompanhamento desde</p><p className="font-medium text-neutral-700 mt-0.5">{formatDate(patient.startDate)}</p></div>
          <div><p className="text-xs text-neutral-400">Valor por sessão</p><p className="font-medium text-neutral-700 mt-0.5">{formatCurrency(patient.sessionPrice)}</p></div>
          <div><p className="text-xs text-neutral-400">Duração</p><p className="font-medium text-neutral-700 mt-0.5">{patient.sessionDuration} minutos</p></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl w-fit">
        {(['timeline', 'notes', 'financial'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${tab === t ? 'bg-white text-neutral-800 shadow-sm font-medium' : 'text-neutral-500 hover:text-neutral-700'}`}>
            {t === 'timeline' ? 'Linha do tempo' : t === 'notes' ? '🔒 Anotações' : 'Financeiro'}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {tab === 'timeline' && (
        <div className="space-y-3">
          {sessions.length === 0 && appointments.length === 0 ? (
            <div className="card text-center py-10 text-neutral-400 text-sm">Nenhuma sessão registrada ainda.</div>
          ) : (
            [...sessions].map(s => (
              <div key={s.id} className="card flex gap-4">
                <div className="w-12 text-center shrink-0">
                  <p className="text-xs text-neutral-400">{formatDateRelative(s.date)}</p>
                  <span className="text-lg">{s.mood ? ['','😔','😟','😐','🙂','😊'][s.mood] : '📝'}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-neutral-700 text-sm">Sessão · {s.duration}min</p>
                  {s.summary && <p className="text-sm text-neutral-500 mt-1">{s.summary}</p>}
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
        <div className="card">
          <p className="text-sm text-neutral-500 py-4 text-center">Histórico financeiro desta pessoa em breve.</p>
        </div>
      )}
    </div>
  )
}
