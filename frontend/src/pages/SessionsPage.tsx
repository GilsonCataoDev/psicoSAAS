import { lazy, Suspense, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, NotebookPen, Plus, Search, Trash2, X } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import { TagBadge, StatusBadge } from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { formatDateRelative } from '@/lib/utils'
import { useSessions, useDeleteSession } from '@/hooks/useApi'
import { useTerms } from '@/hooks/useTerms'
import toast from 'react-hot-toast'

const NewSessionModal = lazy(() => import('@/components/features/sessions/NewSessionModal'))

const MOODS = ['', '1', '2', '3', '4', '5']

export default function SessionsPage() {
  const t = useTerms()
  const [showModal, setShowModal] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<any | null>(null)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data: sessions = [], isLoading } = useSessions({
    search: search || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  })
  const deleteSession = useDeleteSession()

  const hasFilters = search || dateFrom || dateTo
  function clearFilters() { setSearch(''); setDateFrom(''); setDateTo('') }

  async function handleDelete() {
    if (!sessionToDelete) return
    try {
      await deleteSession.mutateAsync(sessionToDelete.id)
      toast.success('Sessão excluída')
      setSessionToDelete(null)
    } catch {
      toast.error('Erro ao excluir sessão')
    }
  }

  return (
    <div className="animate-slide-up space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">{t.sessionsCapitalized}</h1>
          <p className="page-subtitle">
            {sessions.length > 0
              ? `${sessions.length} ${sessions.length !== 1 ? t.sessions : t.session} registrada${sessions.length !== 1 ? 's' : ''}`
              : 'Registre como foi cada atendimento'}
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2" aria-label={`Como foi a ${t.session}?`}>
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Como foi a {t.session}?</span>
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por paciente..."
            className="input-field pl-9 py-2 text-sm"
          />
        </div>
        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="input-field py-2 text-sm w-40"
          title="De"
        />
        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="input-field py-2 text-sm w-40"
          title="Até"
        />
        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700 px-2 py-2">
            <X className="h-3.5 w-3.5" /> Limpar
          </button>
        )}
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
          icon={<NotebookPen className="h-7 w-7" strokeWidth={1.8} />}
          title={hasFilters ? 'Nenhuma sessão encontrada' : 'Nenhuma sessão registrada ainda'}
          description={hasFilters ? 'Tente ajustar os filtros de busca.' : 'Após cada atendimento, registre o que aconteceu. Seus registros ficam seguros e organizados aqui.'}
          action={!hasFilters ? (
            <button onClick={() => setShowModal(true)} className="btn-primary">
              Registrar primeira sessão
            </button>
          ) : undefined}
        />
      )}

      {!isLoading && sessions.length > 0 && (
        <div className="space-y-3">
          {sessions.map(session => (
            <div key={session.id} className="card hover:shadow-lifted hover:-translate-y-px transition-all duration-200 p-4 group">
              <div className="flex items-start gap-3">
                <Avatar name={session.patient?.name ?? 'Paciente removido'} colorClass={session.patient?.avatarColor} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-semibold text-neutral-800 text-sm">{session.patient?.name ?? 'Paciente removido'}</h3>
                    <span className="text-neutral-200 text-xs">-</span>
                    <span className="text-xs text-neutral-400 tabular-nums">{formatDateRelative(session.date)}</span>
                    <span className="text-neutral-200 text-xs hidden sm:inline">-</span>
                    <span className="text-xs text-neutral-400 hidden sm:inline">{session.duration} min</span>
                  </div>
                  {session.summary && (
                    <p className="text-sm text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
                      Evolução registrada
                    </p>
                  )}
                  {(session.tags?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {session.tags.map(t => <TagBadge key={t} tag={t} small />)}
                    </div>
                  )}
                  <Link
                    to={`/prontuario/${session.patientId}`}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-sage-600 hover:text-sage-700"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Ver no prontuário
                  </Link>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {session.mood && (
                    <span className="text-xl leading-none" title="Humor na sessão">
                      {MOODS[session.mood]}
                    </span>
                  )}
                  <StatusBadge status={session.paymentStatus} />
                  <button
                    onClick={() => setSessionToDelete(session)}
                    className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-rose-50 text-neutral-300 hover:text-rose-500"
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

      <Suspense fallback={(
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/25 backdrop-blur-[1px]">
          <div className="rounded-xl bg-white p-4 shadow-xl" role="status" aria-label="Carregando">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-sage-200 border-t-sage-600" />
          </div>
        </div>
      )}>
        {showModal && <NewSessionModal open onClose={() => setShowModal(false)} />}
      </Suspense>
      <ConfirmDialog
        open={!!sessionToDelete}
        title="Excluir sessão"
        description={`Excluir a sessão de ${sessionToDelete?.patient?.name ?? 'paciente removido'}? O registro clínico será removido definitivamente.`}
        confirmLabel="Excluir sessão"
        loading={deleteSession.isPending}
        onClose={() => setSessionToDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
