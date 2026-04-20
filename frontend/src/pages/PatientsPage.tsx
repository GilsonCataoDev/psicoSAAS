import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Filter } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import { TagBadge, StatusBadge } from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import { mockPatients } from '@/lib/mock-data'
import { formatDate } from '@/lib/utils'
import { Patient } from '@/types'
import NewPatientModal from '@/components/features/patients/NewPatientModal'

export default function PatientsPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'paused'>('all')
  const [showModal, setShowModal] = useState(false)

  const filtered = mockPatients.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || p.status === filter
    return matchSearch && matchFilter
  })

  return (
    <div className="animate-slide-up space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Pessoas</h1>
          <p className="page-subtitle">{mockPatients.filter(p => p.status === 'active').length} pessoas em acompanhamento</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nova pessoa
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar pelo nome..." className="input-field pl-9 py-2.5 text-sm" />
        </div>
        <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl">
          {(['all', 'active', 'paused'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${filter === f ? 'bg-white text-neutral-800 shadow-sm font-medium' : 'text-neutral-500 hover:text-neutral-700'}`}>
              {f === 'all' ? 'Todas' : f === 'active' ? 'Ativas' : 'Em pausa'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Search className="w-6 h-6" />} title="Nenhuma pessoa encontrada"
          description="Tente ajustar a busca ou os filtros." />
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
    <Link to={`/pacientes/${patient.id}`}
      className="card flex items-center gap-4 hover:shadow-lifted transition-all duration-200 cursor-pointer">
      <Avatar name={patient.name} colorClass={patient.avatarColor} size="lg" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-medium text-neutral-800">{patient.name}</h3>
          {patient.pronouns && <span className="text-xs text-neutral-400">({patient.pronouns})</span>}
          <StatusBadge status={patient.status} />
        </div>
        <p className="text-sm text-neutral-500 mt-0.5">
          Desde {formatDate(patient.startDate)} · R$ {patient.sessionPrice}/sessão · {patient.sessionDuration}min
        </p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {patient.tags.slice(0, 3).map(tag => <TagBadge key={tag} tag={tag} small />)}
          {patient.tags.length > 3 && <span className="text-xs text-neutral-400">+{patient.tags.length - 3}</span>}
        </div>
      </div>
      <div className="text-neutral-300 shrink-0">›</div>
    </Link>
  )
}
