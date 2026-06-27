import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, Video, MapPin, Trash2, MessageCircle, Pencil, CheckCircle2, XCircle, FileText, ExternalLink } from 'lucide-react'
import {
  format, addDays, startOfWeek, eachDayOfInterval, addWeeks,
  subWeeks, isSameDay, parseISO, isToday,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Avatar from '@/components/ui/Avatar'
import { StatusBadge } from '@/components/ui/Badge'
import { formatTime } from '@/lib/utils'
import { useAppointments, useDeleteAppointment, useDeleteAppointmentGroup, useUpdateAppointmentStatus } from '@/hooks/useApi'
import toast from 'react-hot-toast'
import { openWhatsApp } from '@/lib/whatsapp'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

const NewAppointmentModal = lazy(() => import('@/components/features/agenda/NewAppointmentModal'))
const NewSessionModal = lazy(() => import('@/components/features/sessions/NewSessionModal'))

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7) // 7h–19h
const VIDEO_LINK_RE = /https?:\/\/[^\s)]+/i

export default function AgendaPage() {
  const [searchParams] = useSearchParams()
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [showModal, setShowModal] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<any | null>(null)
  const [appointmentToRemove, setAppointmentToRemove] = useState<any | null>(null)
  const [appointmentToEvolve, setAppointmentToEvolve] = useState<any | null>(null)
  const [deleteScope, setDeleteScope] = useState<'single' | 'future'>('single')
  const weekEnd = addDays(weekStart, 4)
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
  const { data: appointments = [] } = useAppointments({
    from: format(weekStart, 'yyyy-MM-dd'),
    to: format(weekEnd, 'yyyy-MM-dd'),
  })
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
    () => eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 4) }),
    [weekStart],
  )
  const mobileDayKey = format(mobileDay, 'yyyy-MM-dd')
  const mobileAppointments = appointmentsByDate.get(mobileDayKey) ?? []

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
            {format(weekStart, "MMMM 'de' yyyy", { locale: ptBR })}
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
                  : 'bg-white border border-neutral-100 text-neutral-600'
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
                    <p className="text-base font-bold text-neutral-700">{formatTime(appt.time)}</p>
                    <p className="text-[10px] text-neutral-400">{appt.duration}min</p>
                  </div>
                  <div className="w-px h-10 bg-neutral-100 shrink-0" />
                  <Avatar name={appt.patient?.name ?? 'Paciente removido'} colorClass={appt.patient?.avatarColor} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-neutral-800 truncate">{appt.patient?.name ?? 'Paciente removido'}</p>
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
                      <span className="text-[10px] px-2 py-1 rounded-full bg-mist-50 text-mist-700">
                        {appt.recurringFrequency === 'biweekly' ? '15 em 15' : 'semanal'}
                      </span>
                    )}
                    {appt.isFixedScheduleException && (
                      <span className="text-[10px] px-2 py-1 rounded-full bg-amber-50 text-amber-700">
                        pontual
                      </span>
                    )}
                  </div>
                )}
                <div className={`grid gap-2 border-t border-neutral-100 pt-3 ${appt.modality === 'online' ? 'grid-cols-4' : 'grid-cols-3'}`}>
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
        <div className="agenda-grid-header agenda-grid-line grid grid-cols-[64px_repeat(5,1fr)] border-b border-neutral-100">
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
            <div key={hour} className="agenda-grid-line grid grid-cols-[64px_repeat(5,1fr)] border-b border-neutral-50 min-h-[72px]">
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
