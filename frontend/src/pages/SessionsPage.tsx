import { useState } from 'react'
import { Plus, FileText, Trash2, CalendarDays } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import { TagBadge, StatusBadge } from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import { formatDateRelative } from '@/lib/utils'
import NewSessionModal from '@/components/features/sessions/NewSessionModal'
import { useSessions, useDeleteSession } from '@/hooks/useApi'
import toast from 'react-hot-toast'

const MOODS = ['', '😔', '😟', '😐', '🙂', '😊']

export default function SessionsPage() {
  const [showModal, setShowModal] = useState(false)
  const { data: sessions = [], isLoading } = useSessions()
  const deleteSession = useDeleteSession()

  async function handleDelete(id: string, patientName: string) {
    if (!confirm(`Excluir sessão de ${patientName}? Esta ação não pode ser desfeita.`)) return
    try {
      await deleteSession.mutateAsync(id)
      toast.success('Sessão excluída')
    } catch {
      toast.error('Erro ao excluir sessão')
    }
  }

  return (
    <div className="animate-slide-up space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Sessões</h1>
          <p className="page-subtitle">
            {sessions.length > 0
              ? `${sessions.length} sessão${sessions.length !== 1 ? 'ões' : ''} registrada${sessions.length !== 1 ? 's' : ''}`
              : 'Registre como foi cada atendimento'}
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Como foi a sessão?</span>
        </button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-neutral-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && sessions.length === 0 && (
        <EmptyState
          icon={<CalendarDays className="w-6 h-6" />}
          title="Nenhuma sessão registrada ainda"
          description="Após cada atendimento, registre o que aconteceu. Seus registros ficam seguros e organizados aqui."
          action={
            <button onClick={() => setShowModal(true)} className="btn-primary">
              Registrar primeira sessão
            </button>
          }
        />
      )}

      {!isLoading && sessions.length > 0 && (
        <div className="space-y-3">
          {sessions.map(session => (
            <div key={session.id} className="card hover:shadow-lifted hover:-translate-y-px transition-all duration-200 p-4 group">
              <div className="flex items-start gap-3">
                <Avatar name={session.patient!.name} colorClass={session.patient!.avatarColor} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-semibold text-neutral-800 text-sm">{session.patient!.name}</h3>
                    <span className="text-neutral-200 text-xs">·</span>
                    <span className="text-xs text-neutral-400 tabular-nums">{formatDateRelative(session.date)}</span>
                    <span className="text-neutral-200 text-xs hidden sm:inline">·</span>
                    <span className="text-xs text-neutral-400 hidden sm:inline">{session.duration} min</span>
                  </div>
                  {session.summary && (
                    <p className="text-sm text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
                      {session.summary}
                    </p>
                  )}
                  {session.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {session.tags.map(t => <TagBadge key={t} tag={t} small />)}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {session.mood && (
                    <span className="text-xl leading-none" title="Humor na sessão">
                      {MOODS[session.mood]}
                    </span>
                  )}
                  <StatusBadge status={session.paymentStatus} />
                  <button
                    onClick={() => handleDelete(session.id, session.patient!.name)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-rose-50 text-neutral-300 hover:text-rose-500"
                    title="Excluir sessão"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <NewSessionModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  )
}
