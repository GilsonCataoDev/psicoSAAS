import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Video, MapPin } from 'lucide-react'
import {
  format, addDays, startOfWeek, eachDayOfInterval, addWeeks,
  subWeeks, isSameDay, parseISO, isToday,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Avatar from '@/components/ui/Avatar'
import { StatusBadge } from '@/components/ui/Badge'
import { formatTime } from '@/lib/utils'
import { useAppointments } from '@/hooks/useApi'
import NewAppointmentModal from '@/components/features/agenda/NewAppointmentModal'

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7) // 7h–19h

export default function AgendaPage() {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [showModal, setShowModal] = useState(false)
  const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 4) })
  const { data: appointments = [] } = useAppointments()

  // Mobile: só mostra o dia atual
  const [mobileDay, setMobileDay] = useState(new Date())
  const mobileDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 4) })

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
            className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-500 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="btn-secondary text-sm py-2 hidden sm:block">Hoje</button>
          <button onClick={() => setWeekStart(w => addWeeks(w, 1))}
            className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-500 transition-colors">
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
                <Avatar name={appt.patient!.name} colorClass={appt.patient!.avatarColor} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-neutral-800 truncate">{appt.patient!.name}</p>
                  <div className="flex items-center gap-1 mt-0.5 text-xs text-neutral-400">
                    {appt.modality === 'online'
                      ? <><Video className="w-3 h-3 text-mist-500" />Online</>
                      : <><MapPin className="w-3 h-3 text-sage-500" />Presencial</>}
                  </div>
                </div>
                <StatusBadge status={appt.status} />
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
      <div className="hidden lg:block card overflow-hidden p-0">
        <div className="grid grid-cols-[64px_repeat(5,1fr)] border-b border-neutral-100">
          <div className="p-3" />
          {days.map(day => (
            <div key={day.toISOString()}
              className={`p-3 text-center border-l border-neutral-100 ${isToday(day) ? 'bg-sage-50' : ''}`}>
              <p className="text-xs text-neutral-400 capitalize">{format(day, 'EEE', { locale: ptBR })}</p>
              <p className={`text-lg font-semibold mt-0.5 ${isToday(day) ? 'text-sage-600' : 'text-neutral-700'}`}>
                {format(day, 'd')}
              </p>
            </div>
          ))}
        </div>
        <div className="overflow-y-auto max-h-[480px]">
          {HOURS.map(hour => (
            <div key={hour} className="grid grid-cols-[64px_repeat(5,1fr)] border-b border-neutral-50 min-h-[72px]">
              <div className="p-2 text-xs text-neutral-400 text-right pr-3 pt-2">{hour}:00</div>
              {days.map(day => {
                const dayAppts = appointments.filter(a =>
                  isSameDay(parseISO(a.date), day) && parseInt(a.time) === hour,
                )
                return (
                  <div key={day.toISOString()}
                    className={`border-l border-neutral-100 p-1 ${isToday(day) ? 'bg-sage-50/40' : ''}`}>
                    {dayAppts.map(appt => (
                      <div key={appt.id}
                        className="bg-sage-100 border border-sage-200 rounded-xl p-2 cursor-pointer hover:bg-sage-200 transition-colors mb-1">
                        <div className="flex items-center gap-1.5">
                          {appt.modality === 'online'
                            ? <Video className="w-3 h-3 text-mist-500 shrink-0" />
                            : <MapPin className="w-3 h-3 text-sage-600 shrink-0" />}
                          <span className="text-xs text-sage-800 font-medium">{formatTime(appt.time)}</span>
                        </div>
                        <p className="text-xs text-sage-700 truncate mt-0.5">
                          {appt.patient?.name.split(' ')[0]}
                        </p>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <NewAppointmentModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  )
}
