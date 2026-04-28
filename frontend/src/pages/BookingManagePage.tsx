import { useState } from 'react'
import { Link2, Check, X, Wallet, Settings, Clock, RefreshCw } from 'lucide-react'
import { formatCurrency, formatDateRelative } from '@/lib/utils'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import {
  useBookings, useBookingPage, useSaveBookingPage,
  useConfirmBooking, useRejectBooking, usePayBooking,
  useDailyBookingLink, useAvailability, useSaveAvailability,
} from '@/hooks/useApi'

const STATUS_CONFIG = {
  pending:   { label: 'Aguardando',     className: 'bg-amber-100 text-amber-700'      },
  confirmed: { label: 'Confirmado',     className: 'bg-sage-100 text-sage-700'        },
  cancelled: { label: 'Cancelado',      className: 'bg-neutral-100 text-neutral-500'  },
  completed: { label: 'Realizado',      className: 'bg-mist-100 text-mist-700'        },
  no_show:   { label: 'Não compareceu', className: 'bg-rose-100 text-rose-700'        },
}

const PAY_CONFIG = {
  pending:  { label: 'Pendente',     className: 'bg-amber-100 text-amber-700'     },
  paid:     { label: 'Pago',         className: 'bg-sage-100 text-sage-700'       },
  waived:   { label: 'Cortesia',     className: 'bg-neutral-100 text-neutral-500' },
  refunded: { label: 'Reembolsado',  className: 'bg-rose-100 text-rose-700'       },
}

const BOOKING_FILTERS = [
  { v: 'all',       l: 'Todos'      },
  { v: 'pending',   l: 'Aguardando' },
  { v: 'confirmed', l: 'Confirmados'},
  { v: 'cancelled', l: 'Cancelados' },
] as const

export default function BookingManagePage() {
  const [tab, setTab] = useState<'requests' | 'settings'>('requests')
  const [filter, setFilter] = useState<string>('all')

  const { data: bookings = [], isLoading } = useBookings()
  const { data: bookingPage } = useBookingPage()
  const { data: dailyLink, refetch: refetchLink } = useDailyBookingLink()
  const confirmBooking = useConfirmBooking()
  const rejectBooking = useRejectBooking()
  const payBooking = usePayBooking()

  const bookingUrl = dailyLink?.url ?? '…'

  function copyLink() {
    navigator.clipboard.writeText(bookingUrl)
    toast.success('Link copiado! 🔗')
  }

  async function confirm(id: string) {
    await confirmBooking.mutateAsync(id)
    toast.success('Sessão confirmada ✓')
  }

  async function reject(id: string) {
    await rejectBooking.mutateAsync(id)
    toast('Solicitação recusada.', { icon: '✕' })
  }

  async function markPaid(id: string) {
    await payBooking.mutateAsync(id)
    toast.success('Pagamento registrado ✓')
  }

  const filtered = filter === 'all' ? bookings : bookings.filter((b: any) => b.status === filter)

  const expiresLabel = dailyLink?.expiresAt
    ? new Date(dailyLink.expiresAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
    : null

  return (
    <div className="animate-slide-up space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Agendamentos Online</h1>
          <p className="page-subtitle">Gerencie as solicitações do seu link público</p>
        </div>
        <button onClick={() => setTab(t => t === 'requests' ? 'settings' : 'requests')}
          className="btn-secondary flex items-center gap-2 text-sm shrink-0">
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">{tab === 'requests' ? 'Configurações' : 'Solicitações'}</span>
        </button>
      </div>

      {/* Link card */}
      <div className="card bg-gradient-to-r from-sage-500 to-sage-600 text-white border-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p className="text-sage-100 text-xs">Seu link de agendamento de hoje</p>
          {expiresLabel && (
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full text-white/90">
              renova às {expiresLabel}
            </span>
          )}
        </div>
        <p className="font-mono text-sm break-all mb-3">{bookingUrl}</p>
        <div className="flex gap-2 flex-wrap">
          <button onClick={copyLink}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
            <Link2 className="w-4 h-4" />Copiar
          </button>
          {dailyLink?.token && (
            <a href={`${import.meta.env.BASE_URL}agendar/${dailyLink.token}`} target="_blank" rel="noreferrer"
              className="bg-white text-sage-700 hover:bg-sage-50 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
              Visualizar
            </a>
          )}
          <button onClick={() => refetchLink()}
            title="Atualizar link"
            className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-xl transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {tab === 'requests' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Aguardando',     value: bookings.filter((b: any) => b.status === 'pending').length,        icon: <Clock className="w-4 h-4 text-amber-500" /> },
              { label: 'Confirmados',    value: bookings.filter((b: any) => b.status === 'confirmed').length,      icon: <Check className="w-4 h-4 text-sage-500" />  },
              { label: 'Pag. pendentes', value: bookings.filter((b: any) => b.paymentStatus === 'pending').length, icon: <Wallet className="w-4 h-4 text-amber-500" /> },
            ].map(s => (
              <div key={s.label} className="card text-center p-3 lg:p-6">
                <div className="flex justify-center mb-1">{s.icon}</div>
                <p className="text-2xl font-bold text-neutral-800">{s.value}</p>
                <p className="text-xs text-neutral-500 mt-0.5 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Filtros */}
          <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl overflow-x-auto scrollbar-none">
            {BOOKING_FILTERS.map(({ v, l }) => (
              <button key={v} onClick={() => setFilter(v)}
                className={`flex-none px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap ${
                  filter === v
                    ? 'bg-white text-neutral-800 shadow-sm font-medium'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}>
                {l}
              </button>
            ))}
          </div>

          {/* Lista */}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => <div key={i} className="h-28 bg-neutral-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.length === 0
                ? <div className="card text-center py-10 text-neutral-400 text-sm">Nenhuma solicitação aqui.</div>
                : filtered.map((b: any) => (
                  <BookingCard key={b.id} booking={b}
                    onConfirm={confirm} onReject={reject} onMarkPaid={markPaid} />
                ))
              }
            </div>
          )}
        </>
      )}

      {tab === 'settings' && <BookingSettings page={bookingPage} />}
    </div>
  )
}

// ─── Card de solicitação ──────────────────────────────────────────────────────
function BookingCard({ booking, onConfirm, onReject, onMarkPaid }: {
  booking: any
  onConfirm: (id: string) => void
  onReject:  (id: string) => void
  onMarkPaid:(id: string) => void
}) {
  const s = STATUS_CONFIG[booking.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending
  const p = PAY_CONFIG[booking.paymentStatus as keyof typeof PAY_CONFIG] ?? PAY_CONFIG.pending

  return (
    <div className="card space-y-3 p-4">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-medium text-neutral-800">{booking.patientName}</h3>
          <span className={cn('badge', s.className)}>{s.label}</span>
          <span className={cn('badge', p.className)}>{p.label}</span>
        </div>
        <p className="text-xs text-neutral-500 mt-0.5">
          {booking.patientEmail}
          {booking.patientPhone && ` · ${booking.patientPhone}`}
        </p>
        <p className="text-sm font-medium text-neutral-700 mt-1.5">
          📅 {formatDateRelative(booking.date)} às {booking.time} · {booking.duration}min · {formatCurrency(booking.amount)}
        </p>
        {booking.patientNotes && (
          <p className="text-sm text-neutral-500 mt-2 bg-neutral-50 rounded-xl px-3 py-2">
            💬 "{booking.patientNotes}"
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {booking.status === 'pending' && (
          <>
            <button onClick={() => onConfirm(booking.id)}
              className="btn-primary text-sm py-2 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />Confirmar
            </button>
            <button onClick={() => onReject(booking.id)}
              className="btn-secondary text-sm py-2 flex items-center gap-1.5 text-rose-600 hover:bg-rose-50">
              <X className="w-3.5 h-3.5" />Recusar
            </button>
          </>
        )}
        {booking.status === 'confirmed' && booking.paymentStatus === 'pending' && (
          <button onClick={() => onMarkPaid(booking.id)}
            className="btn-secondary text-sm py-2 flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5" />Marcar como pago
          </button>
        )}
        {booking.paymentStatus === 'paid' && (
          <span className="text-sm text-sage-600 flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />Pago via {booking.paymentMethod ?? 'PIX'}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Configurações da página pública ─────────────────────────────────────────

const WEEKDAYS = [
  { d: 1, label: 'Seg' },
  { d: 2, label: 'Ter' },
  { d: 3, label: 'Qua' },
  { d: 4, label: 'Qui' },
  { d: 5, label: 'Sex' },
  { d: 6, label: 'Sáb' },
  { d: 0, label: 'Dom' },
]

type DaySlot = { enabled: boolean; startTime: string; endTime: string }

function BookingSettings({ page }: { page: any }) {
  const saveBookingPage = useSaveBookingPage()
  const { data: savedSlots = [] } = useAvailability()
  const saveAvailability = useSaveAvailability()

  const [form, setForm] = useState({
    title:               page?.title ?? 'Agende sua sessão',
    description:         page?.description ?? '',
    // +() converte string "150.00" do PostgreSQL decimal para número
    sessionPrice:        +(page?.sessionPrice ?? 150),
    sessionDuration:     +(page?.sessionDuration ?? 50),
    slotInterval:        +(page?.slotInterval ?? 60),
    pixKey:              page?.pixKey ?? '',
    confirmationMessage: page?.confirmationMessage ?? '',
    allowPresencial:     page?.allowPresencial ?? true,
    allowOnline:         page?.allowOnline ?? true,
  })

  // Horários por dia da semana
  const [schedule, setSchedule] = useState<Record<number, DaySlot>>(() => {
    const base: Record<number, DaySlot> = {}
    WEEKDAYS.forEach(({ d }) => {
      base[d] = { enabled: false, startTime: '09:00', endTime: '18:00' }
    })
    return base
  })

  // Preenche schedule quando os slots chegam da API
  const [scheduleSynced, setScheduleSynced] = useState(false)
  if (!scheduleSynced && savedSlots.length > 0) {
    const next: Record<number, DaySlot> = {}
    WEEKDAYS.forEach(({ d }) => {
      const slot = savedSlots.find(s => s.weekday === d)
      next[d] = slot
        ? { enabled: true, startTime: slot.startTime.slice(0, 5), endTime: slot.endTime.slice(0, 5) }
        : { enabled: false, startTime: '09:00', endTime: '18:00' }
    })
    setSchedule(next)
    setScheduleSynced(true)
  }

  function toggleDay(d: number) {
    setSchedule(s => ({ ...s, [d]: { ...s[d], enabled: !s[d].enabled } }))
  }
  function setTime(d: number, field: 'startTime' | 'endTime', val: string) {
    setSchedule(s => ({ ...s, [d]: { ...s[d], [field]: val } }))
  }

  async function save() {
    try {
      // Salva configurações gerais
      await saveBookingPage.mutateAsync(form)
      // Salva horários de disponibilidade
      const slots = WEEKDAYS
        .filter(({ d }) => schedule[d]?.enabled)
        .map(({ d }) => ({ weekday: d, startTime: schedule[d].startTime, endTime: schedule[d].endTime }))
      await saveAvailability.mutateAsync(slots)
      toast.success('Configurações salvas ✓')
    } catch {
      toast.error('Erro ao salvar. Tente novamente.')
    }
  }

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const isSaving = saveBookingPage.isPending || saveAvailability.isPending

  const enabledCount = WEEKDAYS.filter(({ d }) => schedule[d]?.enabled).length

  return (
    <div className="space-y-5">
      {/* ── Horários de atendimento ─────────────────── */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Horários de atendimento</h2>
          {enabledCount === 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-lg">
              ⚠️ Nenhum dia configurado — slots não aparecerão
            </span>
          )}
        </div>
        <p className="text-xs text-neutral-400">Selecione os dias e defina o início/fim do expediente. Os slots são gerados automaticamente pelo intervalo abaixo.</p>

        <div className="space-y-2">
          {WEEKDAYS.map(({ d, label }) => {
            const slot = schedule[d]
            return (
              <div key={d} className={cn(
                'flex items-center gap-3 p-3 rounded-xl border transition-all',
                slot.enabled ? 'border-sage-200 bg-sage-50' : 'border-neutral-100 bg-neutral-50'
              )}>
                {/* Toggle */}
                <button type="button" onClick={() => toggleDay(d)}
                  className={cn(
                    'w-11 h-6 rounded-full transition-colors shrink-0',
                    slot.enabled ? 'bg-sage-500' : 'bg-neutral-200'
                  )}>
                  <div className={cn(
                    'w-5 h-5 bg-white rounded-full shadow transition-transform mt-0.5 mx-0.5',
                    slot.enabled ? 'translate-x-5' : ''
                  )} />
                </button>
                <span className={cn('w-8 text-sm font-medium shrink-0', slot.enabled ? 'text-sage-700' : 'text-neutral-400')}>
                  {label}
                </span>
                {slot.enabled ? (
                  <div className="flex items-center gap-2 flex-1 flex-wrap">
                    <input
                      type="time" value={slot.startTime}
                      onChange={e => setTime(d, 'startTime', e.target.value)}
                      className="input-field py-1.5 text-sm w-28"
                    />
                    <span className="text-neutral-400 text-xs">até</span>
                    <input
                      type="time" value={slot.endTime}
                      onChange={e => setTime(d, 'endTime', e.target.value)}
                      className="input-field py-1.5 text-sm w-28"
                    />
                  </div>
                ) : (
                  <span className="text-xs text-neutral-400 flex-1">Indisponível</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Sessão ──────────────────────────────────── */}
      <div className="card space-y-4">
        <h2 className="section-title">Sua página de agendamento</h2>
        <div>
          <label className="label">Título da página</label>
          <input value={form.title} onChange={e => set('title', e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="label">Mensagem de boas-vindas</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} className="input-field resize-none" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Valor da sessão (R$)</label>
            <input type="number" value={form.sessionPrice} onChange={e => set('sessionPrice', +e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label">Duração da sessão (min)</label>
            <input type="number" value={form.sessionDuration} onChange={e => set('sessionDuration', +e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label">Intervalo entre slots (min)</label>
            <input type="number" value={form.slotInterval} onChange={e => set('slotInterval', +e.target.value)} className="input-field" />
          </div>
        </div>
      </div>

      {/* ── Pagamento ───────────────────────────────── */}
      <div className="card space-y-4">
        <h2 className="section-title">Pagamento</h2>
        <div>
          <label className="label">Chave PIX</label>
          <input value={form.pixKey} onChange={e => set('pixKey', e.target.value)} className="input-field"
            placeholder="CPF, e-mail, telefone ou chave aleatória" />
        </div>
        <div>
          <label className="label">Mensagem de confirmação</label>
          <textarea value={form.confirmationMessage} onChange={e => set('confirmationMessage', e.target.value)} rows={2}
            className="input-field resize-none"
            placeholder="Mensagem enviada após o agendamento..." />
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={save} disabled={isSaving} className="btn-primary flex items-center gap-2">
          {isSaving
            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Check className="w-4 h-4" />}
          Salvar configurações
        </button>
      </div>
    </div>
  )
}
