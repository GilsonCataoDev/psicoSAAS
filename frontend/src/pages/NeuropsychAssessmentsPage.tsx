import { useMemo, useState } from 'react'
import { BrainCircuit, Plus, Search } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { useCreateNeuropsychAssessment, useNeuropsychAssessments, usePatients } from '@/hooks/useApi'
import { formatDate } from '@/lib/utils'

const STATUS_LABELS = {
  planning: 'Planejamento',
  in_progress: 'Em aplicação',
  integration: 'Integração',
  completed: 'Concluída',
  archived: 'Arquivada',
} as const

export default function NeuropsychAssessmentsPage() {
  const navigate = useNavigate()
  const { data: assessments = [], isLoading } = useNeuropsychAssessments()
  const { data: patients = [] } = usePatients()
  const create = useCreateNeuropsychAssessment()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('active')
  const [modalOpen, setModalOpen] = useState(false)
  const [patientId, setPatientId] = useState('')

  const availablePatients = patients.filter(patient =>
    patient.status === 'active' && !assessments.some(assessment => assessment.patientId === patient.id && ['planning', 'in_progress', 'integration'].includes(assessment.status)),
  )
  const filtered = useMemo(() => assessments.filter(assessment => {
    const matchesSearch = assessment.patient?.name?.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))
    const matchesStatus = status === 'all'
      || (status === 'active' && ['planning', 'in_progress', 'integration'].includes(assessment.status))
      || assessment.status === status
    return matchesSearch && matchesStatus
  }), [assessments, search, status])

  async function startAssessment() {
    if (!patientId) return toast.error('Selecione uma pessoa')
    try {
      const assessment = await create.mutateAsync({ patientId })
      toast.success('Avaliação iniciada')
      setModalOpen(false)
      navigate(`/avaliacoes/${assessment.id}`)
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Não foi possível iniciar a avaliação')
    }
  }

  return (
    <div className="animate-slide-up space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Avaliações neuropsicológicas</h1>
          <p className="page-subtitle">Planeje a bateria, registre resultados e integre as informações clínicas.</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary flex shrink-0 items-center gap-2">
          <Plus className="h-4 w-4" /><span className="hidden sm:inline">Iniciar avaliação</span>
        </button>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input value={search} onChange={event => setSearch(event.target.value)} className="input-field pl-9" placeholder="Buscar por paciente..." />
        </div>
        <select value={status} onChange={event => setStatus(event.target.value)} className="input-field sm:w-48">
          <option value="active">Em andamento</option><option value="all">Todas</option>
          <option value="planning">Planejamento</option><option value="in_progress">Em aplicação</option>
          <option value="integration">Integração</option><option value="completed">Concluídas</option>
        </select>
      </div>

      {isLoading ? <div className="h-40 animate-pulse rounded-2xl bg-neutral-100 dark:bg-white/5" /> : filtered.length === 0 ? (
        <EmptyState icon={<BrainCircuit className="h-7 w-7" />} title="Nenhuma avaliação encontrada"
          description="Inicie uma avaliação para organizar todo o processo em um só lugar."
          action={<button onClick={() => setModalOpen(true)} className="btn-primary">Iniciar primeira avaliação</button>} />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map(assessment => {
            const progress = assessment.batteryProgress.total
              ? Math.round(assessment.batteryProgress.applied / assessment.batteryProgress.total * 100) : 0
            return (
              <Link key={assessment.id} to={`/avaliacoes/${assessment.id}`} className="card group p-5 transition hover:-translate-y-0.5 hover:shadow-lifted">
                <div className="flex items-start justify-between gap-3">
                  <div><h2 className="font-semibold text-neutral-900 group-hover:text-sage-700 dark:text-white">{assessment.patient?.name}</h2>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Iniciada em {formatDate(assessment.startedAt)}</p></div>
                  <span className="rounded-full bg-sage-50 px-2.5 py-1 text-xs font-semibold text-sage-700 dark:bg-sage-950/40 dark:text-sage-200">{STATUS_LABELS[assessment.status]}</span>
                </div>
                {assessment.batteryProgress.total === 0 ? (
                  <div className="mt-5 rounded-xl border border-dashed border-neutral-200 bg-neutral-50/60 px-3 py-2.5 text-xs dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="font-medium text-neutral-700 dark:text-neutral-200">Bateria ainda não iniciada</p>
                    <p className="mt-0.5 text-neutral-500 dark:text-neutral-400">Próxima ação: adicionar o primeiro procedimento.</p>
                  </div>
                ) : <>
                  <div className="mt-5 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                    <span>{assessment.batteryProgress.applied}/{assessment.batteryProgress.total} procedimentos aplicados</span><span>{progress}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10"><div className="h-full rounded-full bg-sage-500" style={{ width: `${progress}%` }} /></div>
                </>}
              </Link>
            )
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Iniciar avaliação neuropsicológica"
        description="A pessoa passará a aparecer no modo de avaliação, sem perder o histórico anterior.">
        <div className="space-y-4">
          <div><label className="label">Paciente</label><select value={patientId} onChange={event => setPatientId(event.target.value)} className="input-field">
            <option value="">Selecione...</option>{availablePatients.map(patient => <option key={patient.id} value={patient.id}>{patient.name}</option>)}
          </select></div>
          <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">O sistema registra apenas o nome dos procedimentos e os resultados produzidos pelo profissional. Não inclua itens, estímulos, manuais ou chaves de testes protegidos.</p>
          <div className="flex justify-end gap-2"><button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button><button onClick={startAssessment} disabled={create.isPending} className="btn-primary">{create.isPending ? 'Iniciando...' : 'Iniciar'}</button></div>
        </div>
      </Modal>
    </div>
  )
}
