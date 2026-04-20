import { useState } from 'react'
import { Plus, FileText } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import { TagBadge, StatusBadge } from '@/components/ui/Badge'
import { mockSessions } from '@/lib/mock-data'
import { formatDateRelative } from '@/lib/utils'
import NewSessionModal from '@/components/features/sessions/NewSessionModal'

const MOODS = ['', '😔', '😟', '😐', '🙂', '😊']

export default function SessionsPage() {
  const [showModal, setShowModal] = useState(false)

  return (
    <div className="animate-slide-up space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Sessões</h1>
          <p className="page-subtitle">{mockSessions.length} sessões registradas</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />Como foi a sessão?
        </button>
      </div>

      <div className="space-y-3">
        {mockSessions.map(session => (
          <div key={session.id} className="card hover:shadow-lifted transition-all cursor-pointer">
            <div className="flex items-start gap-4">
              <Avatar name={session.patient!.name} colorClass={session.patient!.avatarColor} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium text-neutral-800">{session.patient!.name}</h3>
                  <span className="text-neutral-300">·</span>
                  <span className="text-sm text-neutral-500">{formatDateRelative(session.date)}</span>
                  <span className="text-neutral-300">·</span>
                  <span className="text-sm text-neutral-500">{session.duration}min</span>
                </div>
                {session.summary && (
                  <p className="text-sm text-neutral-500 mt-1.5 line-clamp-2">{session.summary}</p>
                )}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {session.tags.map(t => <TagBadge key={t} tag={t} small />)}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                {session.mood && <span className="text-xl">{MOODS[session.mood]}</span>}
                <StatusBadge status={session.paymentStatus} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {mockSessions.length === 0 && (
        <div className="card text-center py-14">
          <FileText className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
          <p className="font-medium text-neutral-600">Nenhuma sessão registrada</p>
          <p className="text-sm text-neutral-400 mt-1 mb-4">Registre como foi após cada atendimento.</p>
          <button onClick={() => setShowModal(true)} className="btn-primary">Registrar primeira sessão</button>
        </div>
      )}

      <NewSessionModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  )
}
