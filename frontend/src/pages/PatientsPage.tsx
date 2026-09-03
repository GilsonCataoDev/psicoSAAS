import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { BrainCircuit, LayoutGrid, LayoutList, Plus, Search, Upload, UsersRound } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import { TagBadge, StatusBadge } from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import { formatCurrency, formatDate, patientStartDate } from '@/lib/utils'
import { Patient } from '@/types'

type PatientStatus = 'active' | 'paused' | 'discharged'
import NewPatientModal from '@/components/features/patients/NewPatientModal'
import ImportPatientsModal from '@/components/features/patients/ImportPatientsModal'
import { usePatients, useUpdatePatient } from '@/hooks/useApi'
import { PLANS, useSubscriptionStore } from '@/store/subscription'
import toast from 'react-hot-toast'
import { patientMatchesSearch } from '@/lib/patientSearch'
import { useTerms } from '@/hooks/useTerms'
import { hasPsychologyModules } from '@/lib/professions'
import { useAuthStore } from '@/store/auth'

export default function PatientsPage() {
  const t = useTerms()
  const showCareMode = hasPsychologyModules(useAuthStore(s => s.user?.profession))
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const initialSearch = typeof location.state === 'object'
    && location.state
    && 'search' in location.state
    ? String(location.state.search ?? '')
    : ''
  const [search, setSearch] = useState(initialSearch)
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'discharged'>('all')
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')
  const [careMode, setCareMode] = useState<'all' | 'psychotherapy' | 'neuropsychological_assessment'>('all')
  const [showModal, setShowModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const { data: patients = [], isLoading } = usePatients()
  const subscription = useSubscriptionStore((s) => s.subscription)

  const filtered = patients.filter((p) => {
    const matchSearch = patientMatchesSearch(p, search)
    const matchFilter = filter === 'all' || p.status === filter
    const matchCareMode = careMode === 'all' || p.careMode === careMode
    return matchSearch && matchFilter && matchCareMode
  }).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }))

  const groupedPatients = filtered.reduce<Record<string, Patient[]>>((groups, patient) => {
    const firstLetter = patient.name.trim().charAt(0).toLocaleUpperCase('pt-BR') || '#'
    const key = /^[A-ZÀ-Ý]$/i.test(firstLetter) ? firstLetter : '#'
    groups[key] = groups[key] ?? []
    groups[key].push(patient)
    return groups
  }, {})

  const groupLetters = Object.keys(groupedPatients).sort((a, b) => {
    if (a === '#') return 1
    if (b === '#') return -1
    return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
  })

  const activeCount = patients.filter(p => p.status === 'active').length
  const currentPlan = PLANS.find(p => p.id === (subscription.planId ?? subscription.plan)) ?? PLANS[0]
  const patientLimit = currentPlan.maxPatients
  const reachedPatientLimit = patientLimit !== -1 && activeCount >= patientLimit

  useEffect(() => {
    if (searchParams.get('new') === '1' && !reachedPatientLimit) {
      setShowModal(true)
    }
  }, [reachedPatientLimit, searchParams])

  function openCreatePatientModal() {
    if (reachedPatientLimit) {
      toast.error(`Limite de ${patientLimit} ${t.patients} ativos atingido no plano ${currentPlan.name}.`)
      return
    }
    setShowModal(true)
  }

  return (
    <div className="animate-slide-up space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">{t.patientsCapitalized}</h1>
          <p className="page-subtitle">
            {patientLimit === -1
              ? `${activeCount} em acompanhamento · sem limite no plano ${currentPlan.name}`
              : `${activeCount}/${patientLimit} ${t.patients} ativos no plano ${currentPlan.name}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-neutral-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-neutral-800' : 'text-neutral-400 hover:text-neutral-600'}`}
              aria-label="Visualização em lista"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-white shadow-sm text-neutral-800' : 'text-neutral-400 hover:text-neutral-600'}`}
              aria-label="Visualização em kanban"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => setShowImportModal(true)}
            className="btn-secondary flex items-center gap-2"
            aria-label="Importar CSV"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Importar CSV</span>
          </button>
          <button
            onClick={openCreatePatientModal}
            className="btn-primary flex items-center gap-2"
            aria-disabled={reachedPatientLimit}
            aria-label={`Novo ${t.patient}`}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo {t.patient}</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, telefone, email ou tag..."
            className="input-field pl-9"
          />
        </div>
        <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl">
          {(['all', 'active', 'paused', 'discharged'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-sm transition-all ${
                filter === f
                  ? 'bg-white text-neutral-800 shadow-sm font-semibold'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}>
              {f === 'all' ? 'Todas' : f === 'active' ? 'Ativas' : f === 'paused' ? 'Inativas' : 'Alta'}
            </button>
          ))}
        </div>
        {/* Psicoterapia x avaliação neuropsicológica é distinção de psicologia:
            não faz sentido oferecer o filtro às demais profissões. */}
        {showCareMode && (
          <select value={careMode} onChange={event => setCareMode(event.target.value as typeof careMode)} className="input-field sm:w-56" aria-label="Filtrar por modo de atendimento">
            <option value="all">Todos os atendimentos</option>
            <option value="psychotherapy">Psicoterapia</option>
            <option value="neuropsychological_assessment">Avaliação neuropsicológica</option>
          </select>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-neutral-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : viewMode === 'kanban' ? (
        <KanbanBoard patients={filtered} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<UsersRound className="h-7 w-7" strokeWidth={1.8} />}
          title={search || filter !== 'all' || careMode !== 'all' ? `Nenhum ${t.patient} encontrado` : `Nenhum ${t.patient} cadastrado ainda`}
          description={
            search || filter !== 'all' || careMode !== 'all'
              ? 'Tente ajustar a busca ou os filtros.'
              : reachedPatientLimit
                ? `Seu plano ${currentPlan.name} permite até ${patientLimit} ${t.patients} ativos.`
                : 'Adicione sua primeira pessoa para começar a acompanhar o processo.'
          }
          action={
            !search && filter === 'all' && !reachedPatientLimit
              ? <button onClick={openCreatePatientModal} className="btn-primary">Cadastrar primeiro {t.patient}</button>
              : undefined
          }
        />
      ) : (
        <div className="space-y-5">
          {groupLetters.map(letter => (
            <section key={letter} className="space-y-2" aria-labelledby={`patients-letter-${letter}`}>
              <div className="sticky top-0 z-10 flex items-center gap-3 bg-neutral-50/95 py-1 backdrop-blur dark:bg-neutral-950/90">
                <h2 id={`patients-letter-${letter}`} className="w-8 text-sm font-bold text-sage-700">
                  {letter}
                </h2>
                <div className="h-px flex-1 bg-neutral-100" />
                <span className="text-xs font-medium text-neutral-400">
                  {groupedPatients[letter].length} {groupedPatients[letter].length === 1 ? t.patient : t.patients}
                </span>
              </div>
              <div className="grid gap-3">
                {groupedPatients[letter].map((patient) => <PatientCard key={patient.id} patient={patient} />)}
              </div>
            </section>
          ))}
        </div>
      )}

      <NewPatientModal open={showModal} onClose={() => setShowModal(false)} />
      <ImportPatientsModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        reachedPatientLimit={reachedPatientLimit}
        currentPlanName={currentPlan.name}
      />
    </div>
  )
}

const KANBAN_COLUMNS: { status: PatientStatus; label: string; color: string; bg: string }[] = [
  { status: 'active',     label: 'Ativo',   color: 'text-emerald-700', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  { status: 'paused',     label: 'Pausado', color: 'text-amber-700',   bg: 'bg-amber-50 dark:bg-amber-950/30' },
  { status: 'discharged', label: 'Alta',    color: 'text-sky-700',     bg: 'bg-sky-50 dark:bg-sky-950/30' },
]

function KanbanBoard({ patients }: { patients: Patient[] }) {
  const updatePatient = useUpdatePatient()
  const dragId = useRef<string | null>(null)
  const [dragOver, setDragOver] = useState<PatientStatus | null>(null)

  function handleDrop(status: PatientStatus) {
    if (!dragId.current) return
    const patient = patients.find(p => p.id === dragId.current)
    if (!patient || patient.status === status) return
    updatePatient.mutate(
      { id: patient.id, data: { status } },
      { onError: () => toast.error('Erro ao atualizar status') },
    )
    dragId.current = null
    setDragOver(null)
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
      {KANBAN_COLUMNS.map(col => {
        const colPatients = patients.filter(p => p.status === col.status)
        const isOver = dragOver === col.status
        return (
          <div
            key={col.status}
            onDragOver={e => { e.preventDefault(); setDragOver(col.status) }}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => handleDrop(col.status)}
            className={`rounded-2xl p-3 min-h-[200px] transition-all ${col.bg} ${isOver ? 'ring-2 ring-sage-400 ring-offset-2' : ''}`}
          >
            <div className={`flex items-center justify-between mb-3 px-1`}>
              <h3 className={`text-sm font-bold ${col.color}`}>{col.label}</h3>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-white/70 ${col.color}`}>
                {colPatients.length}
              </span>
            </div>
            <div className="space-y-2">
              {colPatients.length === 0 && (
                <p className="text-center text-xs text-neutral-400 py-8">Nenhum aqui</p>
              )}
              {colPatients.map(patient => (
                <div
                  key={patient.id}
                  draggable
                  onDragStart={() => { dragId.current = patient.id }}
                  onDragEnd={() => setDragOver(null)}
                  className="bg-white dark:bg-neutral-900 rounded-xl p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-lifted transition-all"
                >
                  <Link to={`/pacientes/${patient.id}`} className="flex items-center gap-2.5 group" draggable={false}>
                    <Avatar name={patient.name} colorClass={patient.avatarColor} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate text-neutral-800 group-hover:text-sage-700 transition-colors">
                        {patient.name}
                      </p>
                      <p className="text-xs text-neutral-400 truncate">
                        {patient.billingType === 'monthly_package'
                          ? `${formatCurrency(Number(patient.monthlyPackagePrice ?? 0))}/mês`
                          : `${formatCurrency(Number(patient.sessionPrice ?? 0))}/sessão`}
                      </p>
                    </div>
                  </Link>
                  {patient.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {patient.tags.slice(0, 2).map(tag => <TagBadge key={tag} tag={tag} small />)}
                      {patient.tags.length > 2 && (
                        <span className="text-xs text-neutral-400 self-center">+{patient.tags.length - 2}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PatientCard({ patient }: { patient: Patient }) {
  const t = useTerms()
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
          {patient.careMode === 'neuropsychological_assessment' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:bg-violet-950/40 dark:text-violet-200">
              <BrainCircuit className="h-3 w-3" /> Avaliação
            </span>
          )}
        </div>
        <p className="text-xs text-neutral-400 mt-0.5 truncate">
          Desde {formatDate(patientStartDate(patient.startDate, patient.createdAt))} · {patient.billingType === 'monthly_package'
            ? `${formatCurrency(Number(patient.monthlyPackagePrice ?? 0))}/mês · ${patient.monthlyIncludedSessions ?? 4} ${t.sessions}`
            : `${formatCurrency(Number(patient.sessionPrice ?? 0))}/${t.session}`}
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
