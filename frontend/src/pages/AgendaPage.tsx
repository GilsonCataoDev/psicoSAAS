import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, Video, MapPin, Trash2, MessageCircle, Pencil } from 'lucide-react'
import {
  format, addDays, startOfWeek, eachDayOfInterval, addWeeks,
  subWeeks, isSameDay, parseISO, isToday,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Avatar from '@/components/ui/Avatar'
import { StatusBadge } from '@/components/ui/Badge'
import { formatTime } from '@/lib/utils'
import { useAppointments, useDeleteAppointment, useDeleteAppointmentGroup } from '@/hooks/useApi'
import NewAppointmentModal from '@/components/features/agenda/NewAppointmentModal'
import toast from 'react-hot-toast'
import { openWhatsApp } from '@/lib/whatsapp'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7) // 7h–19h

export default function AgendaPage() {
  const [searchParams] = useSearchParams()
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [showModal, setShowModal] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<any | null>(null)
  const [appointmentToRemove, setAppointmentToRemove] = useState<any | null>(null)
  const [deleteScope, setDeleteScope] = useState<'single' | 'future'>('single')
  const weekEnd = addDays(weekStart, 4)
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
  const { data: appointments = [] } = useAppointments({
    from: format(weekStart, 'yyyy-MM-dd'),
    to: format(weekEnd, 'yyyy-MM-dd'),
  })
  const visibleHours = Array.from(new Set([
    ...HOURS,
    ...appointments
      .map(a => Number(a.time.slice(0, 2)))
      .filter(hour => Number.isFinite(hour) && hour >= 0 && hour <= 23),
  ])).sort((a, b) => a - b)
  const deleteAppointment = useDeleteAppointment()
  const deleteGroup = useDeleteAppointmentGroup()

  // Mobile: só mostra o dia atual
  const [mobileDay, setMobileDay] = useState(new Date())
  const mobileDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 4) })

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowModal(true)
    }
  }, [searchParams])

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

  function closeModal() {
    setShowModal(false)
    setEditingAppointment(null)
  }

  return (
    <div className="animate-slide-up space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Agenda</h1>
          <p className="page-subtitle capitalize">
            {format(weekStart, "MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
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
          {appointments
            .filter(a => isSameDay(parseISO(a.date), mobileDay))
            .sort((a, b) => a.time.localeCompare(b.time))
            .map(appt => (
              <div key={appt.id}
                className="card flex items-center gap-3 py-3 px-4">
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
                <button
                  type="button"
                  onClick={() => editAppointment(appt)}
                  className="p-2 rounded-lg text-neutral-300 hover:text-mist-600 hover:bg-mist-50 transition-colors"
                  title="Alterar esta ocorrencia"
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
            ))}
          {appointments.filter(a => isSameDay(parseISO(a.date), mobileDay)).length === 0 && (
            <div className="card text-center py-10 text-neutral-400 text-sm">
              Nenhuma sessão neste dia 🌿
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
                const dayAppts = appointments.filter(a =>
                  isSameDay(parseISO(a.date), day) && parseInt(a.time) === hour,
                )
                return (
                  <div key={day.toISOString()}
                    className={`agenda-grid-line border-l border-neutral-100 p-1 ${isToday(day) ? 'agenda-today bg-sage-50/40' : ''}`}>
                    {dayAppts.map(appt => (
                      <div key={appt.id}
                        className="agenda-appointment group bg-sage-100 border border-sage-200 rounded-xl p-2 hover:bg-sage-200 transition-colors mb-1">
                        <div className="flex items-center gap-1.5">
                          {appt.modality === 'online'
                            ? <Video className="w-3 h-3 text-mist-500 shrink-0" />
                            : <MapPin className="w-3 h-3 text-sage-600 shrink-0" />}
                          <span className="text-xs text-sage-800 dark:text-sage-100 font-semibold flex-1">{formatTime(appt.time)}</span>
                          <button
                            type="button"
                            onClick={() => messageAppointment(appt)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-sage-700 hover:text-sage-800 hover:bg-white/70 transition-all"
                            title="Enviar WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => editAppointment(appt)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-sage-700 hover:text-mist-700 hover:bg-white/70 transition-all"
                            title="Alterar esta ocorrencia"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setAppointmentToRemove(appt)}
                            disabled={deleteAppointment.isPending}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-sage-700 hover:text-rose-600 hover:bg-white/70 transition-all disabled:opacity-50"
                            title="Remover agendamento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-sage-700 dark:text-neutral-100 font-medium truncate mt-0.5">
                          {appt.patient?.name?.split(' ')[0] ?? 'Paciente'}
                        </p>
                        {(appt.isRecurring || appt.isFixedScheduleException) && (
                          <p className="text-[10px] text-sage-700/70 dark:text-sage-100/75 mt-0.5">
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

      <NewAppointmentModal open={showModal} onClose={closeModal} appointment={editingAppointment} />
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
