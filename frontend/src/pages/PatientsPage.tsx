import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Users } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import { TagBadge, StatusBadge } from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/utils'
import { Patient } from '@/types'
import NewPatientModal from '@/components/features/patients/NewPatientModal'
import { usePatients } from '@/hooks/useApi'

export default function PatientsPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'paused'>('all')
  const [showModal, setShowModal] = useState(false)
  const { data: patients = [], isLoading } = usePatients()

  const filtered = patients.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || p.status === filter
    return matchSearch && matchFilter
  })

  const activeCount = patients.filter(p => p.status === 'active').length

  return (
    <div className="animate-slide-up space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Pacientes</h1>
          <p className="page-subtitle">
            {activeCount > 0
              ? `${activeCount} em acompanhamento`
              : 'Nenhum paciente cadastrado ainda'}
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo paciente</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar pelo nome..."
            className="input-field pl-9"
          />
        </div>
        <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl">
          {(['all', 'active', 'paused'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-sm transition-all ${
                filter === f
                  ? 'bg-white text-neutral-800 shadow-sm font-semibold'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}>
              {f === 'all' ? 'Todas' : f === 'active' ? 'Ativas' : 'Em pausa'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-neutral-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="w-6 h-6" />}
          title={search || filter !== 'all' ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado ainda'}
          description={
            search || filter !== 'all'
              ? 'Tente ajustar a busca ou os filtros.'
              : 'Adicione sua primeira pessoa para começar a acompanhar o processo.'
          }
          action={
            !search && filter === 'all'
              ? <button onClick={() => setShowModal(true)} className="btn-primary">Cadastrar primeiro paciente</button>
              : undefined
          }
        />
      ) : (
        <div className="grid gap-3">
          {filtered.map((patient) => <PatientCard key={patient.id} patient={patient} />)}
        </div>
      )}

      <NewPatientModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  )
}

function PatientCard({ patient }: { patient: Patient }) {
  return (
    <Link
      to={`/pacientes/${patient.id}`}
      className="card flex items-center gap-3.5 hover:shadow-lifted hover:-translate-y-px transition-all duration-200 cursor-pointer p-4 group"
    >
      <Avatar name={patient.name} colorClass={patient.avatarColor} size="md" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-neutral-800 text-sm group-hover:text-sage-700 transition-colors">
            {patient.name}
          </h3>
          {patient.pronouns && (
            <span className="text-xs text-neutral-400">({patient.pronouns})</span>
          )}
          <StatusBadge status={patient.status} />
        </div>
        <p className="text-xs text-neutral-400 mt-0.5 truncate">
          Desde {formatDate(patient.startDate ?? patient.createdAt)} · R$ {patient.sessionPrice}/sessão
        </p>
        {patient.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {patient.tags.slice(0, 3).map(tag => <TagBadge key={tag} tag={tag} small />)}
            {patient.tags.length > 3 && (
              <span className="text-xs text-neutral-400 self-center">+{patient.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>

      <span className="text-neutral-300 group-hover:text-sage-400 transition-colors shrink-0 text-lg leading-none">›</span>
    </Link>
  )
}
