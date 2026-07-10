import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, Video, MapPin, Trash2, MessageCircle, Pencil, CheckCircle2, XCircle, FileText, ExternalLink, Search } from 'lucide-react'
import {
  format, addDays, startOfWeek, eachDayOfInterval, addWeeks,
  subWeeks, isSameDay, parseISO, isToday, getDay,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Avatar from '@/components/ui/Avatar'
import { StatusBadge } from '@/components/ui/Badge'
import { formatTime } from '@/lib/utils'
import { patientMatchesSearch } from '@/lib/patientSearch'
import {
  useAppointments,
  useAvailability,
  useBlockedDates,
  useDeleteAppointment,
  useDeleteAppointmentGroup,
  useUpdateAppointmentStatus,
} from '@/hooks/useApi'
import toast from 'react-hot-toast'
import { openWhatsApp } from '@/lib/whatsapp'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

const NewAppointmentModal = lazy(() => import('@/components/features/agenda/NewAppointmentModal'))
const NewSessionModal = lazy(() => import('@/components/features/sessions/NewSessionModal'))

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7) // 7h–19h
const DAYS_IN_WEEK = 7
const VIDEO_LINK_RE = /https?:\/\/[^\s)]+/i
const FREE_APPOINTMENT_STATUSES = new Set(['cancelled', 'no_show'])
const MIN_FREE_RANGE_MINUTES = 30

function normalizeAgendaSearch(value: string | number | null | undefined) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function timeToMinutes(time?: string | null) {
  const [hour, minute] = String(time ?? '').slice(0, 5).split(':').map(Number)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null
  return hour * 60 + minute
}

function minutesToTime(minutes: number) {
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function roundUpMinutes(minutes: number, step = 15) {
  return Math.ceil(minutes / step) * step
}

function formatWeekRange(start: Date, end: Date) {
  const sameMonth = format(start, 'yyyy-MM') === format(end, 'yyyy-MM')
  const sameYear = format(start, 'yyyy') === format(end, 'yyyy')

  if (sameMonth) return format(start, "MMMM 'de' yyyy", { locale: ptBR })
  if (sameYear) {
    return `${format(start, 'dd MMM', { locale: ptBR })} - ${format(end, "dd MMM 'de' yyyy", { locale: ptBR })}`
  }
  return `${format(start, 'dd/MM/yyyy')} - ${format(end, 'dd/MM/yyyy')}`
}

function mergeMinuteRanges(ranges: { start: number; end: number }[]) {
  const sorted = ranges
    .filter(range => range.end > range.start)
    .sort((a, b) => a.start - b.start)
  const merged: { start: number; end: number }[] = []

  for (const range of sorted) {
    const last = merged[merged.length - 1]
    if (last && range.start <= last.end) {
      last.end = Math.max(last.end, range.end)
    } else {
      merged.push({ ...range })
    }
  }

  return merged
}

function appointmentMatchesSearch(appt: any, query: string) {
  const normalizedQuery = normalizeAgendaSearch(query)
  if (!normalizedQuery) return true

  const patientMatch = appt.patient ? patientMatchesSearch(appt.patient, query) : false
  if (patientMatch) return true

  const searchable = [
    appt.notes,
    appt.date,
    formatTime(appt.time ?? ''),
    appt.modality === 'online' ? 'online' : 'presencial',
    appt.status,
  ]

  return searchable
    .map(normalizeAgendaSearch)
    .some(value => value.includes(normalizedQuery))
}

export default function AgendaPage() {
  const [searchParams] = useSearchParams()
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [showModal, setShowModal] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<any | null>(null)
  const [appointmentToRemove, setAppointmentToRemove] = useState<any | null>(null)
  const [appointmentToEvolve, setAppointmentToEvolve] = useState<any | null>(null)
  const [deleteScope, setDeleteScope] = useState<'single' | 'future'>('single')
  const [listDay, setListDay] = useState(new Date())
  const [patientSearch, setPatientSearch] = useState('')
  const weekEnd = addDays(weekStart, DAYS_IN_WEEK - 1)
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
  const { data: appointments = [] } = useAppointments({
    from: format(weekStart, 'yyyy-MM-dd'),
    to: format(weekEnd, 'yyyy-MM-dd'),
  })
  const { data: availability = [] } = useAvailability()
  const { data: blockedDates = [] } = useBlockedDates()
  const { appointmentsByDate, appointmentsByDateHour, visibleHours } = useMemo(() => {
    const byDate = new Map<string, typeof appointments>()
    const byDateHour = new Map<string, typeof appointments>()
    const hours = new Set(HOURS)

    for (const appointment of appointments) {
      const hour = Number(appointment.time.slice(0, 2))
      if (Number.isFinite(hour) && hour >= 0 && hour <= 23) hours.add(hour)

      const dateItems = byDate.get(appointment.date) ?? []
      dateItems.push(appointment)
      byDate.set(appointment.date, dateItems)

      const hourKey = `${appointment.date}:${hour}`
      const hourItems = byDateHour.get(hourKey) ?? []
      hourItems.push(appointment)
      byDateHour.set(hourKey, hourItems)
    }

    for (const items of byDate.values()) {
      items.sort((a, b) => String(a.time).localeCompare(String(b.time)))
    }

    for (const items of byDateHour.values()) {
      items.sort((a, b) => String(a.time).localeCompare(String(b.time)))
    }

    return {
      appointmentsByDate: byDate,
      appointmentsByDateHour: byDateHour,
      visibleHours: Array.from(hours).sort((a, b) => a - b),
    }
  }, [appointments])
  const deleteAppointment = useDeleteAppointment()
  const deleteGroup = useDeleteAppointmentGroup()
  const updateStatus = useUpdateAppointmentStatus()

  // Mobile: só mostra o dia atual
  const [mobileDay, setMobileDay] = useState(new Date())
  const mobileDays = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: addDays(weekStart, DAYS_IN_WEEK - 1) }),
    [weekStart],
  )
  const mobileDayKey = format(mobileDay, 'yyyy-MM-dd')
  const mobileAppointments = appointmentsByDate.get(mobileDayKey) ?? []
  const listDayKey = format(listDay, 'yyyy-MM-dd')
  const dayListAppointments = appointmentsByDate.get(listDayKey) ?? []
  const patientSearchResults = useMemo(() => {
    const query = patientSearch.trim()
    if (!query) return []
    return appointments
      .filter(appt => appointmentMatchesSearch(appt, query))
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
  }, [appointments, patientSearch])
  const weeklyAvailabilitySummary = useMemo(() => {
    const blocked = new Set(blockedDates.map(item => item.date))
    const todayKey = format(new Date(), 'yyyy-MM-dd')
    const now = new Date()
    const nowMinutes = roundUpMinutes(now.getHours() * 60 + now.getMinutes())

    return days.flatMap(day => {
      const dateKey = format(day, 'yyyy-MM-dd')
      if (dateKey < todayKey) return []
      if (blocked.has(dateKey)) return []

      const daySlots = mergeMinuteRanges(availability
        .filter(slot => slot.weekday === getDay(day))
        .map(slot => {
          const start = timeToMinutes(slot.startTime)
          const end = timeToMinutes(slot.endTime)
          if (start === null || end === null || end <= start) return null
          return { start, end }
        })
        .filter((slot): slot is { start: number; end: number } => Boolean(slot)))

      if (!daySlots.length) return []

      const busyRanges = mergeMinuteRanges((appointmentsByDate.get(dateKey) ?? [])
        .filter(appt => !FREE_APPOINTMENT_STATUSES.has(appt.status))
        .map(appt => {
          const start = timeToMinutes(appt.time)
          if (start === null) return null
          return { start, end: start + Number(appt.duration || 50) }
        })
        .filter((range): range is { start: number; end: number } => Boolean(range)))

      const ranges: { start: string; end: string }[] = []

      for (const slot of daySlots) {
        let freeStart = dateKey === todayKey ? Math.max(slot.start, nowMinutes) : slot.start

        for (const busy of busyRanges) {
          if (busy.end <= freeStart || busy.start >= slot.end) continue
          const freeEnd = Math.min(busy.start, slot.end)
          if (freeEnd - freeStart >= MIN_FREE_RANGE_MINUTES) {
            ranges.push({ start: minutesToTime(freeStart), end: minutesToTime(freeEnd) })
          }
          freeStart = Math.max(freeStart, busy.end)
        }

        if (slot.end - freeStart >= MIN_FREE_RANGE_MINUTES) {
          ranges.push({ start: minutesToTime(freeStart), end: minutesToTime(slot.end) })
        }
      }

      return ranges.length ? [{ day, dateKey, ranges }] : []
    })
  }, [appointmentsByDate, availability, blockedDates, days])

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowModal(true)
    }
  }, [searchParams])

  useEffect(() => {
    if (!mobileDays.some(day => isSameDay(day, mobileDay))) {
      setMobileDay(weekStart)
    }
  }, [mobileDays, mobileDay, weekStart])

  useEffect(() => {
    if (!days.some(day => isSameDay(day, listDay))) {
      const todayInWeek = days.find(day => isToday(day))
      setListDay(todayInWeek ?? weekStart)
    }
  }, [days, listDay, weekStart])

  async function removeAppointment() {
    if (!appointmentToRemove) return
    try {
      if (deleteScope === 'future' && appointmentToRemove.recurringGroupId) {
        const result = await deleteGroup.mutateAsync({
          groupId: appointmentToRemove.recurringGroupId,
          fromDate: appointmentToRemove.date,
        })
        toast.success(`${result.removed} sessões removidas`)
      } else {
        await deleteAppointment.mutateAsync(appointmentToRemove.id)
        toast.success('Sessão removida')
      }
      setAppointmentToRemove(null)
      setDeleteScope('single')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Erro ao remover agendamento.')
    }
  }

  function messageAppointment(appt: any) {
    const phone = appt.patient?.phone
    if (!phone) {
      toast.error('Essa pessoa não tem WhatsApp cadastrado.')
      return
    }

    const first = appt.patient?.name?.split(' ')[0] ?? ''
    const dateLabel = format(parseISO(appt.date), "EEEE, dd 'de' MMMM", { locale: ptBR })
    openWhatsApp(
      phone,
      `Olá, ${first}! Lembrando que temos sessão em ${dateLabel} às ${formatTime(appt.time)}. Até lá!`,
    )
  }

  function editAppointment(appt: any) {
    setEditingAppointment(appt)
    setShowModal(true)
  }

  function evolveAppointment(appt: any) {
    if (!appt.patientId) {
      toast.error('Este agendamento não tem paciente vinculado.')
      return
    }
    setAppointmentToEvolve(appt)
  }

  function openVideoAppointment(appt: any) {
    const link = appt.meetingUrl || String(appt.notes ?? '').match(VIDEO_LINK_RE)?.[0]
    if (!link) {
      toast.error('Informe o link da chamada neste agendamento.')
      editAppointment(appt)
      return
    }
    window.open(link, '_blank', 'noopener,noreferrer')
  }

  async function changeAppointmentStatus(appt: any, status: 'completed' | 'no_show') {
    try {
      await updateStatus.mutateAsync({ id: appt.id, status })
      toast.success(status === 'completed' ? 'Sessão marcada como finalizada' : 'Falta registrada')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Erro ao atualizar status.')
    }
  }

  function closeModal() {
    setShowModal(false)
    setEditingAppointment(null)
  }

  return (
    <div className="animate-slide-up space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Agenda</h1>
          <p className="page-subtitle capitalize">
            {formatWeekRange(weekStart, weekEnd)}
          </p>
        </div>
        <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
          <button onClick={() => setWeekStart(w => subWeeks(w, 1))}
            className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-500 dark:text-neutral-300 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="btn-secondary text-sm py-2 hidden sm:block">Hoje</button>
          <button onClick={() => setWeekStart(w => addWeeks(w, 1))}
            className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-500 dark:text-neutral-300 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2" aria-label="Agendar">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Agendar</span>
          </button>
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="section-title">Pesquisar pacientes na agenda</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-300">
              Encontre atendimentos desta semana por nome, telefone, email, modalidade ou observacao.
            </p>
          </div>
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              value={patientSearch}
              onChange={e => setPatientSearch(e.target.value)}
              className="input-field h-11 pl-9"
              placeholder="Buscar paciente na semana..."
            />
          </div>
        </div>

        {patientSearch.trim() && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                {patientSearchResults.length} {patientSearchResults.length === 1 ? 'resultado' : 'resultados'}
              </p>
              <button
                type="button"
                onClick={() => setPatientSearch('')}
                className="text-xs font-medium text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-100"
              >
                Limpar
              </button>
            </div>

            {patientSearchResults.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-200 py-7 text-center text-sm text-neutral-400 dark:border-white/10">
                Nenhum atendimento encontrado nesta semana.
              </div>
            ) : (
              <div className="grid gap-2 lg:grid-cols-2">
                {patientSearchResults.map(appt => {
                  const appointmentDay = parseISO(appt.date)
                  return (
                    <div
                      key={appt.id}
                      className="rounded-2xl border border-neutral-100 bg-white p-3 dark:border-white/10 dark:bg-white/[0.04]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="min-w-[56px] rounded-xl bg-sage-50 px-2 py-2 text-center text-sage-700 dark:bg-sage-500/15 dark:text-sage-100">
                          <p className="text-sm font-bold">{formatTime(appt.time)}</p>
                          <p className="text-[10px] capitalize">{format(appointmentDay, 'EEE dd', { locale: ptBR })}</p>
                        </div>
                        <Avatar name={appt.patient?.name ?? 'Paciente removido'} colorClass={appt.patient?.avatarColor} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                              {appt.patient?.name ?? 'Paciente removido'}
                            </p>
                            <StatusBadge status={appt.status} />
                          </div>
                          <p className="mt-1 flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-300">
                            {appt.modality === 'online'
                              ? <><Video className="h-3 w-3 text-mist-500" />Online</>
                              : <><MapPin className="h-3 w-3 text-sage-500" />Presencial</>}
                          </p>
                          {appt.patient?.phone && (
                            <p className="mt-1 truncate text-xs text-neutral-400 dark:text-neutral-300">{appt.patient.phone}</p>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-neutral-100 pt-3 dark:border-white/10">
                        <button
                          type="button"
                          onClick={() => {
                            setListDay(appointmentDay)
                            setMobileDay(appointmentDay)
                          }}
                          className="btn-secondary px-3 py-2 text-xs"
                        >
                          Ver no dia
                        </button>
                        {appt.patientId && (
                          <>
                            <Link to={`/pacientes/${appt.patientId}`} className="btn-secondary px-3 py-2 text-xs">
                              Perfil
                            </Link>
                            <Link to={`/prontuario/${appt.patientId}`} className="btn-secondary px-3 py-2 text-xs">
                              Prontuario
                            </Link>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => editAppointment(appt)}
                          className="btn-secondary px-3 py-2 text-xs"
                        >
                          Editar
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Desktop: lista do dia em ordem ─────────────────────────── */}
      <div className="hidden lg:block card space-y-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="section-title">Pacientes do dia</h2>
            <p className="text-sm text-neutral-500 capitalize">
              {format(listDay, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {days.map(day => {
              const dayKey = format(day, 'yyyy-MM-dd')
              const count = appointmentsByDate.get(dayKey)?.length ?? 0
              const selected = isSameDay(day, listDay)
              return (
                <button
                  key={dayKey}
                  type="button"
                  onClick={() => setListDay(day)}
                  className={`min-w-[56px] rounded-xl border px-3 py-2 text-center transition-colors ${
                    selected
                      ? 'border-sage-500 bg-sage-500 text-white'
                      : isToday(day)
                      ? 'border-sage-200 bg-sage-50 text-sage-700 hover:bg-sage-100 dark:border-sage-400/30 dark:bg-sage-500/15 dark:text-sage-200 dark:hover:bg-sage-500/25'
                      : 'border-neutral-100 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10'
                  }`}
                >
                  <span className="block text-[10px] uppercase leading-none opacity-80">
                    {format(day, 'EEE', { locale: ptBR })}
                  </span>
                  <span className="mt-1 block text-base font-semibold leading-none">{format(day, 'd')}</span>
                  <span className="mt-1 block text-[10px] leading-none opacity-70">
                    {count} {count === 1 ? 'sessão' : 'sessões'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {dayListAppointments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 py-8 text-center text-sm text-neutral-400">
            Nenhuma sessao neste dia.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-100 dark:divide-white/5 dark:border-white/10">
            {dayListAppointments.map(appt => (
              <div key={appt.id} className="grid grid-cols-[72px_1fr_auto] items-center gap-3 bg-white px-4 py-3 dark:bg-white/5">
                <div className="text-center">
                  <p className="text-base font-bold text-neutral-800 dark:text-white">{formatTime(appt.time)}</p>
                  <p className="text-[11px] text-neutral-400">{appt.duration}min</p>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <Avatar name={appt.patient?.name ?? 'Paciente removido'} colorClass={appt.patient?.avatarColor} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neutral-800 dark:text-white">{appt.patient?.name ?? 'Paciente removido'}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-400">
                        {appt.modality === 'online'
                          ? <><Video className="h-3 w-3 text-mist-500" />Online</>
                          : <><MapPin className="h-3 w-3 text-sage-500" />Presencial</>}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={appt.status} />
                  {appt.patientId && (
                    <Link to={`/prontuario/${appt.patientId}`} className="btn-secondary px-3 py-2 text-xs">
                      Prontuário
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => messageAppointment(appt)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-100 text-neutral-400 hover:bg-sage-50 hover:text-sage-600 dark:border-white/10 dark:hover:bg-white/10 dark:hover:text-sage-200"
                    title="Enviar WhatsApp"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="section-title">Horarios disponiveis</h2>
            <p className="text-sm text-neutral-500">
              Dias desta semana com espaco livre para marcar alguem.
            </p>
          </div>
          <span className="text-xs font-medium text-neutral-400">
            {weeklyAvailabilitySummary.length} {weeklyAvailabilitySummary.length === 1 ? 'dia livre' : 'dias livres'}
          </span>
        </div>

        {weeklyAvailabilitySummary.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 py-7 text-center text-sm text-neutral-400">
            Nenhum horario livre nesta semana.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {weeklyAvailabilitySummary.map(item => (
              <div key={item.dateKey} className="rounded-2xl border border-neutral-100 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold capitalize text-neutral-800 dark:text-white">
                      {format(item.day, 'EEEE', { locale: ptBR })}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {format(item.day, "dd 'de' MMMM", { locale: ptBR })}
                    </p>
                  </div>
                  {isToday(item.day) && (
                    <span className="rounded-full bg-sage-50 px-2 py-1 text-[10px] font-semibold uppercase text-sage-700 dark:bg-sage-500/20 dark:text-sage-200">
                      hoje
                    </span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.ranges.map(range => (
                    <span
                      key={`${item.dateKey}-${range.start}-${range.end}`}
                      className="rounded-lg bg-mist-50 px-2.5 py-1.5 text-xs font-semibold text-mist-700 dark:bg-mist-500/20 dark:text-mist-200"
                    >
                      {range.start}-{range.end}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Mobile: dias em scroll horizontal + lista ──────────────── */}
      <div className="lg:hidden">
        {/* Seletor de dia */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
          {mobileDays.map(day => (
            <button key={day.toISOString()} onClick={() => setMobileDay(day)}
              className={`flex-none flex flex-col items-center py-2 px-3 rounded-2xl min-w-[52px] transition-all ${
                isSameDay(day, mobileDay)
                  ? 'bg-sage-500 text-white'
                  : isToday(day)
                  ? 'bg-sage-50 text-sage-700'
                  : 'bg-white border border-neutral-100 text-neutral-600 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300'
              }`}>
              <span className="text-[10px] uppercase font-medium capitalize">
                {format(day, 'EEE', { locale: ptBR })}
              </span>
              <span className="text-lg font-bold leading-none mt-0.5">{format(day, 'd')}</span>
            </button>
          ))}
        </div>

        {/* Lista do dia selecionado */}
        <div className="space-y-2 mt-3">
          {mobileAppointments.map(appt => (
              <div key={appt.id}
                className="card space-y-3 py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="text-center min-w-12 shrink-0">
                    <p className="text-base font-bold text-neutral-700 dark:text-white">{formatTime(appt.time)}</p>
                    <p className="text-[10px] text-neutral-400">{appt.duration}min</p>
                  </div>
                  <div className="w-px h-10 bg-neutral-100 shrink-0" />
                  <Avatar name={appt.patient?.name ?? 'Paciente removido'} colorClass={appt.patient?.avatarColor} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-neutral-800 dark:text-white truncate">{appt.patient?.name ?? 'Paciente removido'}</p>
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-neutral-400">
                      {appt.modality === 'online'
                        ? <><Video className="w-3 h-3 text-mist-500" />Online</>
                        : <><MapPin className="w-3 h-3 text-sage-500" />Presencial</>}
                    </div>
                  </div>
                  <StatusBadge status={appt.status} />
                </div>
                {(appt.isRecurring || appt.isFixedScheduleException) && (
                  <div className="flex flex-wrap gap-1.5">
                    {appt.isRecurring && (
                      <span className="text-[10px] px-2 py-1 rounded-full bg-mist-50 text-mist-700 dark:bg-mist-500/20 dark:text-mist-200">
                        {appt.recurringFrequency === 'biweekly' ? '15 em 15' : 'semanal'}
                      </span>
                    )}
                    {appt.isFixedScheduleException && (
                      <span className="text-[10px] px-2 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">
                        pontual
                      </span>
                    )}
                  </div>
                )}
                <div className={`grid gap-2 border-t border-neutral-100 pt-3 dark:border-white/10 ${appt.modality === 'online' ? 'grid-cols-4' : 'grid-cols-3'}`}>
                  {appt.modality === 'online' && (
                    <button
                      type="button"
                      onClick={() => openVideoAppointment(appt)}
                      className="btn-secondary inline-flex min-w-0 flex-col items-center justify-center gap-1 px-2 py-2 text-[11px] leading-tight"
                      title="Entrar na chamada"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Chamada
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => evolveAppointment(appt)}
                    className="btn-secondary inline-flex min-w-0 flex-col items-center justify-center gap-1 px-2 py-2 text-[11px] leading-tight"
                    title="Evoluir sessão"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Evoluir
                  </button>
                  <button
                    type="button"
                    onClick={() => changeAppointmentStatus(appt, 'completed')}
                    disabled={updateStatus.isPending || appt.status === 'completed'}
                    className="btn-secondary inline-flex min-w-0 flex-col items-center justify-center gap-1 px-2 py-2 text-[11px] leading-tight disabled:opacity-40"
                    title="Marcar como finalizada"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Finalizar
                  </button>
                  <button
                    type="button"
                    onClick={() => changeAppointmentStatus(appt, 'no_show')}
                    disabled={updateStatus.isPending || appt.status === 'no_show'}
                    className="btn-secondary inline-flex min-w-0 flex-col items-center justify-center gap-1 px-2 py-2 text-[11px] leading-tight disabled:opacity-40"
                    title="Registrar falta"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Falta
                  </button>
                </div>
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => editAppointment(appt)}
                    className="p-2 rounded-lg text-neutral-300 hover:text-mist-600 hover:bg-mist-50 transition-colors"
                    title="Alterar esta ocorrência"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => messageAppointment(appt)}
                    className="p-2 rounded-lg text-neutral-300 hover:text-sage-600 hover:bg-sage-50 transition-colors"
                    title="Enviar WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAppointmentToRemove(appt)}
                    disabled={deleteAppointment.isPending}
                    className="p-2 rounded-lg text-neutral-300 hover:text-rose-500 hover:bg-rose-50 transition-colors disabled:opacity-50"
                    title="Remover agendamento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          {mobileAppointments.length === 0 && (
            <div className="card text-center py-10 text-neutral-400 text-sm">
              Nenhuma sessão neste dia
            </div>
          )}
        </div>
      </div>

      {/* ── Desktop: grade semanal ─────────────────────────────────── */}
      <div className="agenda-grid hidden lg:block card overflow-hidden p-0">
        <div className="agenda-grid-header agenda-grid-line grid grid-cols-[64px_repeat(7,1fr)] border-b border-neutral-100">
          <div className="p-3" />
          {days.map(day => (
            <div key={day.toISOString()}
              className={`agenda-grid-line p-3 text-center border-l border-neutral-100 ${isToday(day) ? 'agenda-today bg-sage-50' : ''}`}>
              <p className="text-xs text-neutral-400 dark:text-neutral-300 capitalize">{format(day, 'EEE', { locale: ptBR })}</p>
              <p className={`text-lg font-semibold mt-0.5 ${isToday(day) ? 'text-sage-600' : 'text-neutral-700'}`}>
                {format(day, 'd')}
              </p>
            </div>
          ))}
        </div>
        <div className="overflow-y-auto max-h-[480px]">
          {visibleHours.map(hour => (
            <div key={hour} className="agenda-grid-line grid grid-cols-[64px_repeat(7,1fr)] border-b border-neutral-50 min-h-[72px]">
              <div className="p-2 text-xs text-neutral-400 dark:text-neutral-300 text-right pr-3 pt-2">{hour}:00</div>
              {days.map(day => {
                const dayKey = format(day, 'yyyy-MM-dd')
                const dayAppts = appointmentsByDateHour.get(`${dayKey}:${hour}`) ?? []
                return (
                  <div key={day.toISOString()}
                    className={`agenda-grid-line border-l border-neutral-100 p-1 ${isToday(day) ? 'agenda-today bg-sage-50/40' : ''}`}>
                    {dayAppts.map(appt => (
                      <div key={appt.id}
                        className="agenda-appointment rounded-xl border border-sage-200 bg-sage-50 p-2.5 shadow-sm transition-colors hover:bg-sage-100 dark:border-white/15 dark:bg-white/[0.07] dark:hover:bg-white/[0.11] mb-1">
                        <div className="flex items-center gap-1.5">
                          {appt.modality === 'online'
                            ? <Video className="w-3 h-3 text-mist-500 shrink-0" />
                            : <MapPin className="w-3 h-3 text-sage-600 dark:text-sage-300 shrink-0" />}
                          <span className="text-xs text-sage-900 dark:text-neutral-50 font-semibold flex-1 truncate">{formatTime(appt.time)}</span>
                          <StatusBadge status={appt.status} />
                        </div>
                        <p className="text-sm text-sage-900 dark:text-neutral-50 font-semibold truncate mt-1.5">
                          {appt.patient?.name?.split(' ')[0] ?? 'Paciente'}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1">
                          <button
                            type="button"
                            onClick={() => evolveAppointment(appt)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-sage-200 bg-white text-sage-700 shadow-sm transition-colors hover:border-sage-300 hover:bg-sage-50 hover:text-sage-900 dark:border-white/10 dark:bg-white/10 dark:text-neutral-100 dark:hover:bg-white/20"
                            title="Evoluir sessão"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          {appt.modality === 'online' && (
                            <button
                              type="button"
                              onClick={() => openVideoAppointment(appt)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-sage-200 bg-white text-sage-700 shadow-sm transition-colors hover:border-mist-200 hover:bg-mist-50 hover:text-mist-700 dark:border-white/10 dark:bg-white/10 dark:text-neutral-100 dark:hover:bg-mist-500/20 dark:hover:text-mist-100"
                              title="Entrar na chamada"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => changeAppointmentStatus(appt, 'completed')}
                            disabled={updateStatus.isPending || appt.status === 'completed'}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-sage-200 bg-white text-sage-700 shadow-sm transition-colors hover:border-sage-300 hover:bg-sage-50 hover:text-sage-900 disabled:opacity-40 dark:border-white/10 dark:bg-white/10 dark:text-neutral-100 dark:hover:bg-white/20"
                            title="Marcar como finalizada"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => changeAppointmentStatus(appt, 'no_show')}
                            disabled={updateStatus.isPending || appt.status === 'no_show'}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-sage-200 bg-white text-sage-700 shadow-sm transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 dark:border-white/10 dark:bg-white/10 dark:text-neutral-100 dark:hover:bg-rose-500/20 dark:hover:text-rose-200"
                            title="Registrar falta"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => messageAppointment(appt)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-sage-200 bg-white text-sage-700 shadow-sm transition-colors hover:border-sage-300 hover:bg-sage-50 hover:text-sage-900 dark:border-white/10 dark:bg-white/10 dark:text-neutral-100 dark:hover:bg-white/20"
                            title="Enviar WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => editAppointment(appt)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-sage-200 bg-white text-sage-700 shadow-sm transition-colors hover:border-mist-200 hover:bg-mist-50 hover:text-mist-700 dark:border-white/10 dark:bg-white/10 dark:text-neutral-100 dark:hover:bg-mist-500/20 dark:hover:text-mist-100"
                            title="Alterar esta ocorrencia"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setAppointmentToRemove(appt)}
                            disabled={deleteAppointment.isPending}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-sage-200 bg-white text-sage-700 shadow-sm transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:border-white/10 dark:bg-white/10 dark:text-neutral-100 dark:hover:bg-rose-500/20 dark:hover:text-rose-200"
                            title="Remover agendamento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {appt.patientId && (
                          <Link
                            to={`/prontuario/${appt.patientId}`}
                            className="mt-1.5 inline-flex h-7 w-full items-center justify-center rounded-lg border border-sage-200 bg-white text-[10px] font-semibold text-sage-800 shadow-sm transition-colors hover:border-sage-300 hover:bg-sage-50 hover:text-sage-950 dark:border-white/10 dark:bg-white/10 dark:text-neutral-100 dark:hover:bg-white/20"
                          >
                            Prontuário
                          </Link>
                        )}
                        {(appt.isRecurring || appt.isFixedScheduleException) && (
                          <p className="text-[10px] font-medium text-sage-700/80 dark:text-neutral-200/80 mt-1">
                            {appt.isFixedScheduleException
                              ? 'alteracao pontual'
                              : appt.recurringFrequency === 'biweekly' ? '15 em 15 dias' : 'semanal'}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <Suspense fallback={(
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/25 backdrop-blur-[1px]">
          <div className="rounded-xl bg-white p-4 shadow-xl" role="status" aria-label="Carregando">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-sage-200 border-t-sage-600" />
          </div>
        </div>
      )}>
        {showModal && <NewAppointmentModal open onClose={closeModal} appointment={editingAppointment} />}
        {appointmentToEvolve && (
          <NewSessionModal
            open
            onClose={() => setAppointmentToEvolve(null)}
            defaults={{
              patientId: appointmentToEvolve.patientId,
              date: appointmentToEvolve.date,
              duration: appointmentToEvolve.duration,
              appointmentId: appointmentToEvolve.id,
            }}
          />
        )}
      </Suspense>
      <ConfirmDialog
        open={!!appointmentToRemove}
        title="Remover agendamento"
        description={`Remover este agendamento${appointmentToRemove?.patient?.name ? ` de ${appointmentToRemove.patient.name}` : ''}? Essa ação não pode ser desfeita.`}
        confirmLabel={deleteScope === 'future' ? 'Remover estas e as próximas' : 'Remover só esta'}
        loading={deleteAppointment.isPending || deleteGroup.isPending}
        onClose={() => { setAppointmentToRemove(null); setDeleteScope('single') }}
        onConfirm={removeAppointment}
      >
        {appointmentToRemove?.isRecurring && (
          <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-white/10">
            <button
              type="button"
              onClick={() => setDeleteScope('single')}
              className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                deleteScope === 'single' ? 'bg-rose-50 dark:bg-rose-900/20' : 'hover:bg-neutral-50 dark:hover:bg-white/5'
              }`}
            >
              <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                deleteScope === 'single' ? 'border-rose-500 bg-rose-500' : 'border-neutral-300 dark:border-white/30'
              }`}>
                {deleteScope === 'single' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
              <div>
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">Remover só esta sessão</p>
                <p className="text-xs text-neutral-400">As demais sessões da série permanecem</p>
              </div>
            </button>
            <div className="border-t border-neutral-100 dark:border-white/5" />
            <button
              type="button"
              onClick={() => setDeleteScope('future')}
              className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                deleteScope === 'future' ? 'bg-rose-50 dark:bg-rose-900/20' : 'hover:bg-neutral-50 dark:hover:bg-white/5'
              }`}
            >
              <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                deleteScope === 'future' ? 'border-rose-500 bg-rose-500' : 'border-neutral-300 dark:border-white/30'
              }`}>
                {deleteScope === 'future' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
              <div>
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">Remover esta e as próximas</p>
                <p className="text-xs text-neutral-400">Remove todas as sessões desta série a partir desta data</p>
              </div>
            </button>
          </div>
        )}
      </ConfirmDialog>
    </div>
  )
}
