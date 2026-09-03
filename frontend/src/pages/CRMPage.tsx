import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, Mail, ChevronRight, Search, Users, UserCheck, UserMinus, UserX, Calendar } from 'lucide-react'
import { usePatients } from '@/hooks/useApi'
import { useBookings } from '@/hooks/api/booking'
import { useAuthStore } from '@/store/auth'
import { useTerms } from '@/hooks/useTerms'
import { formatDate } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'
import EmptyState from '@/components/ui/EmptyState'
import type { Patient } from '@/types'
import type { Booking } from '@/types/booking'

type PipelineTab = 'contatos' | 'ativos' | 'inativos' | 'alta'

export default function CRMPage() {
  const navigate = useNavigate()
  const t = useTerms()
  const user = useAuthStore(s => s.user)
  const [tab, setTab] = useState<PipelineTab>('ativos')
  const [search, setSearch] = useState('')

  const { data: patients = [], isLoading: pLoading } = usePatients()
  const { data: bookings = [], isLoading: bLoading } = useBookings()

  const pendingBookings = useMemo(
    () => bookings.filter(b => b.status === 'pending'),
    [bookings],
  )
  const activePatients = useMemo(
    () => patients.filter(p => p.status === 'active'),
    [patients],
  )
  const pausedPatients = useMemo(
    () => patients.filter(p => p.status === 'paused'),
    [patients],
  )
  const dischargedPatients = useMemo(
    () => patients.filter(p => p.status === 'discharged'),
    [patients],
  )

  const q = search.trim().toLowerCase()

  const filteredBookings = useMemo(
    () => pendingBookings.filter(b =>
      !q ||
      b.patientName.toLowerCase().includes(q) ||
      b.patientEmail.toLowerCase().includes(q) ||
      (b.patientPhone ?? '').includes(q),
    ),
    [pendingBookings, q],
  )

  function filterPatients(list: Patient[]) {
    if (!q) return list
    return list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.email ?? '').toLowerCase().includes(q) ||
      (p.phone ?? '').includes(q),
    )
  }

  const tabs: { id: PipelineTab; label: string; count: number; icon: React.ReactNode; color: string }[] = [
    { id: 'contatos', label: 'Novos contatos', count: pendingBookings.length, icon: <Calendar className="w-4 h-4" />, color: 'text-mist-600' },
    { id: 'ativos', label: t.patientsCapitalized + ' ativos', count: activePatients.length, icon: <UserCheck className="w-4 h-4" />, color: 'text-sage-600' },
    { id: 'inativos', label: 'Inativos / pausados', count: pausedPatients.length, icon: <UserMinus className="w-4 h-4" />, color: 'text-amber-600' },
    { id: 'alta', label: 'Alta', count: dischargedPatients.length, icon: <UserX className="w-4 h-4" />, color: 'text-neutral-400' },
  ]

  const isLoading = pLoading || bLoading

  return (
    <div className="animate-slide-up space-y-5">
      {/* Header */}
      <div>
        <h1 className="page-title">CRM</h1>
        <p className="page-subtitle">Pipeline de {t.patients} e novos contatos</p>
      </div>

      {/* Pipeline tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {tabs.map(({ id, label, count, icon, color }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`card p-3 text-left transition-all hover:shadow-lifted ${tab === id ? 'border-sage-300 dark:border-sage-500 shadow-sm' : ''}`}
          >
            <div className={`flex items-center gap-1.5 ${color} mb-1`}>
              {icon}
              <span className="text-xs font-medium">{label}</span>
            </div>
            <p className={`text-2xl font-semibold ${tab === id ? 'text-sage-700 dark:text-sage-300' : 'text-neutral-700 dark:text-neutral-200'}`}>
              {count}
            </p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Buscar por nome, e-mail ou telefone...`}
          className="input-field pl-9 py-2.5 text-sm w-full"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="card text-center py-10">
          <div className="w-6 h-6 border-2 border-sage-400 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : tab === 'contatos' ? (
        <BookingList bookings={filteredBookings} />
      ) : tab === 'ativos' ? (
        <PatientList patients={filterPatients(activePatients)} onOpen={id => navigate(`/pacientes/${id}`)} emptyLabel={`Nenhum ${t.patient} ativo ainda.`} />
      ) : tab === 'inativos' ? (
        <PatientList patients={filterPatients(pausedPatients)} onOpen={id => navigate(`/pacientes/${id}`)} emptyLabel={`Nenhum ${t.patient} pausado.`} />
      ) : (
        <PatientList patients={filterPatients(dischargedPatients)} onOpen={id => navigate(`/pacientes/${id}`)} emptyLabel={`Nenhum ${t.patient} com alta registrada.`} />
      )}
    </div>
  )
}

function BookingList({ bookings }: { bookings: Booking[] }) {
  if (bookings.length === 0) {
    return (
      <div className="card">
        <EmptyState
          icon={<Calendar className="h-7 w-7" strokeWidth={1.8} />}
          title="Nenhum novo contato pendente"
          description="Quando alguém agendar pela sua página pública sem confirmação automática, aparece aqui."
          className="py-12"
        />
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {bookings.map(b => (
        <div key={b.id} className="card flex items-center gap-4 p-4 hover:shadow-lifted transition-all">
          <Avatar name={b.patientName} colorClass="bg-mist-100 text-mist-700" size="md" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-neutral-800 dark:text-white truncate">{b.patientName}</p>
            <p className="text-xs text-neutral-400 mt-0.5">
              Solicitou {formatDate(b.date)} às {b.time} · enviado {formatDate(b.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {b.patientPhone && (
              <a
                href={`tel:${b.patientPhone}`}
                className="p-2 rounded-lg hover:bg-sage-50 dark:hover:bg-sage-500/10 text-neutral-400 hover:text-sage-600 transition-colors"
                title="Ligar"
              >
                <Phone className="w-4 h-4" />
              </a>
            )}
            <a
              href={`mailto:${b.patientEmail}`}
              className="p-2 rounded-lg hover:bg-sage-50 dark:hover:bg-sage-500/10 text-neutral-400 hover:text-sage-600 transition-colors"
              title="Enviar e-mail"
            >
              <Mail className="w-4 h-4" />
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}

function PatientList({ patients, onOpen, emptyLabel }: {
  patients: Patient[]
  onOpen: (id: string) => void
  emptyLabel: string
}) {
  if (patients.length === 0) {
    return (
      <div className="card">
        <EmptyState
          icon={<Users className="h-7 w-7" strokeWidth={1.8} />}
          title={emptyLabel}
          className="py-12"
        />
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {patients.map(p => (
        <button
          key={p.id}
          onClick={() => onOpen(p.id)}
          className="card w-full flex items-center gap-4 p-4 hover:shadow-lifted hover:-translate-y-px transition-all text-left group"
        >
          <Avatar name={p.name} colorClass={p.avatarColor} size="md" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-neutral-800 dark:text-white truncate">{p.name}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {p.email && (
                <span className="text-xs text-neutral-400 truncate max-w-[160px]">{p.email}</span>
              )}
              {p.phone && (
                <>
                  {p.email && <span className="text-neutral-200 dark:text-neutral-600">·</span>}
                  <span className="text-xs text-neutral-400">{p.phone}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {p.phone && (
              <a
                href={`tel:${p.phone}`}
                onClick={e => e.stopPropagation()}
                className="p-2 rounded-lg hover:bg-sage-50 dark:hover:bg-sage-500/10 text-neutral-300 hover:text-sage-600 transition-colors opacity-0 group-hover:opacity-100"
                title="Ligar"
              >
                <Phone className="w-4 h-4" />
              </a>
            )}
            {p.email && (
              <a
                href={`mailto:${p.email}`}
                onClick={e => e.stopPropagation()}
                className="p-2 rounded-lg hover:bg-sage-50 dark:hover:bg-sage-500/10 text-neutral-300 hover:text-sage-600 transition-colors opacity-0 group-hover:opacity-100"
                title="Enviar e-mail"
              >
                <Mail className="w-4 h-4" />
              </a>
            )}
            <ChevronRight className="w-4 h-4 text-neutral-300 dark:text-neutral-500 group-hover:text-sage-500 transition-colors" />
          </div>
        </button>
      ))}
    </div>
  )
}
