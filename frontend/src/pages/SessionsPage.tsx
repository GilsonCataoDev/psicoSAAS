import { useState } from 'react'
import { Plus, FileText } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import { TagBadge, StatusBadge } from '@/components/ui/Badge'
import { formatDateRelative } from '@/lib/utils'
import NewSessionModal from '@/components/features/sessions/NewSessionModal'
import { useSessions } from '@/hooks/useApi'

const MOODS = ['', '😔', '😟', '😐', '🙂', '😊']

export default function SessionsPage() {
  const [showModal, setShowModal] = useState(false)
  const { data: sessions = [], isLoading } = useSessions()

  return (
    <div className="animate-slide-up space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Sessões</h1>
          <p className="page-subtitle">{sessions.length} sessões registradas</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Como foi a sessão?</span>
        </button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-neutral-100 rounded-2xl animate-pulse" />)}
        </div>
      )}

      <div className="space-y-3">
        {sessions.map(session => (
          <div key={session.id} className="card hover:shadow-lifted transition-all cursor-pointer p-4">
            <div className="flex items-start gap-3">
              <Avatar name={session.patient!.name} colorClass={session.patient!.avatarColor} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-medium text-neutral-800 text-sm">{session.patient!.name}</h3>
                  <span className="text-neutral-300 text-xs">·</span>
                  <span className="text-xs text-neutral-500">{formatDateRelative(session.date)}</span>
                  <span className="text-neutral-300 text-xs hidden sm:inline">·</span>
                  <span className="text-xs text-neutral-500 hidden sm:inline">{session.duration}min</span>
                </div>
                {session.summary && (
                  <p className="text-sm text-neutral-500 mt-1 line-clamp-2">{session.summary}</p>
                )}
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {session.tags.map(t => <TagBadge key={t} tag={t} small />)}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                {session.mood && <span className="text-xl">{MOODS[session.mood]}</span>}
                <StatusBadge status={session.paymentStatus} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {!isLoading && sessions.length === 0 && (
        <div className="card text-center py-14">
          <FileText className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
          <p className="font-medium text-neutral-600">Nenhuma sessão registrada</p>
          <p className="text-sm text-neutral-400 mt-1 mb-4">Registre como foi após cada atendimento.</p>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            Registrar primeira sessão
          </button>
        </div>
      )}

      <NewSessionModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  )
}
