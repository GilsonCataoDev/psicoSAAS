import { useState } from 'react'
import { Link2, Check, X, Wallet, Settings, Clock } from 'lucide-react'
import { mockBookings, mockBookingPage } from '@/lib/mock-booking'
import { Booking } from '@/types/booking'
import { formatCurrency, formatDateRelative } from '@/lib/utils'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

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
  const [bookings, setBookings] = useState<Booking[]>(mockBookings)
  const [tab, setTab] = useState<'requests' | 'settings'>('requests')
  const [filter, setFilter] = useState<string>('all')

  const bookingUrl = `${window.location.origin}/agendar/${mockBookingPage.slug}`

  function copyLink() {
    navigator.clipboard.writeText(bookingUrl)
    toast.success('Link copiado! 🔗')
  }

  function confirm(id: string) {
    setBookings(bs => bs.map(b => b.id === id ? { ...b, status: 'confirmed' } : b))
    toast.success('Sessão confirmada ✓')
  }

  function reject(id: string) {
    setBookings(bs => bs.map(b => b.id === id ? { ...b, status: 'cancelled' } : b))
    toast('Solicitação recusada.', { icon: '✕' })
  }

  function markPaid(id: string) {
    setBookings(bs => bs.map(b => b.id === id ? { ...b, paymentStatus: 'paid', paymentMethod: 'pix' } : b))
    toast.success('Pagamento registrado ✓')
  }

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter)

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
        <p className="text-sage-100 text-xs mb-1.5">Seu link de agendamento</p>
        <p className="font-mono text-sm break-all mb-3">{bookingUrl}</p>
        <div className="flex gap-2">
          <button onClick={copyLink}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
            <Link2 className="w-4 h-4" />Copiar
          </button>
          <a href={`/agendar/${mockBookingPage.slug}`} target="_blank" rel="noreferrer"
            className="bg-white text-sage-700 hover:bg-sage-50 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            Visualizar
          </a>
        </div>
      </div>

      {tab === 'requests' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Aguardando',  value: bookings.filter(b => b.status === 'pending').length,              icon: <Clock className="w-4 h-4 text-amber-500" /> },
              { label: 'Confirmados', value: bookings.filter(b => b.status === 'confirmed').length,            icon: <Check className="w-4 h-4 text-sage-500" />  },
              { label: 'Pag. pendentes', value: bookings.filter(b => b.paymentStatus === 'pending').length,    icon: <Wallet className="w-4 h-4 text-amber-500" /> },
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
          <div className="space-y-3">
            {filtered.length === 0
              ? <div className="card text-center py-10 text-neutral-400 text-sm">Nenhuma solicitação aqui.</div>
              : filtered.map(b => (
                <BookingCard key={b.id} booking={b}
                  onConfirm={confirm} onReject={reject} onMarkPaid={markPaid} />
              ))
            }
          </div>
        </>
      )}

      {tab === 'settings' && <BookingSettings />}
    </div>
  )
}

// ─── Card de solicitação ──────────────────────────────────────────────────────
function BookingCard({ booking, onConfirm, onReject, onMarkPaid }: {
  booking: Booking
  onConfirm: (id: string) => void
  onReject:  (id: string) => void
  onMarkPaid:(id: string) => void
}) {
  const s = STATUS_CONFIG[booking.status]
  const p = PAY_CONFIG[booking.paymentStatus]

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
function BookingSettings() {
  const page = mockBookingPage
  const [saved, setSaved] = useState(false)

  function save() {
    setSaved(true)
    toast.success('Configurações salvas ✓')
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-5">
      <div className="card space-y-4">
        <h2 className="section-title">Sua página de agendamento</h2>
        <div>
          <label className="label">Título da página</label>
          <input defaultValue={page.title} className="input-field" />
        </div>
        <div>
          <label className="label">Mensagem de boas-vindas</label>
          <textarea defaultValue={page.description} rows={3} className="input-field resize-none" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Slug (link)</label>
            <div className="flex">
              <span className="px-3 py-3 bg-neutral-100 border border-r-0 border-neutral-200 rounded-l-xl text-sm text-neutral-500 whitespace-nowrap">
                /agendar/
              </span>
              <input defaultValue={page.slug} className="input-field rounded-l-none" />
            </div>
          </div>
          <div>
            <label className="label">Valor da sessão (R$)</label>
            <input type="number" defaultValue={page.sessionPrice} className="input-field" />
          </div>
          <div>
            <label className="label">Duração (min)</label>
            <input type="number" defaultValue={page.sessionDuration} className="input-field" />
          </div>
          <div>
            <label className="label">Intervalo entre slots (min)</label>
            <input type="number" defaultValue={page.slotInterval} className="input-field" />
          </div>
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="section-title">Disponibilidade semanal</h2>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(day => (
            <div key={day} className="flex flex-col sm:flex-row sm:items-center gap-2 pb-3 border-b border-neutral-50 last:border-0">
              <span className="w-20 text-sm font-medium text-neutral-700 shrink-0">
                {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][day]}
              </span>
              <div className="flex items-center gap-2 flex-1">
                <input type="time" defaultValue="09:00" className="input-field py-2 flex-1 sm:max-w-[130px]" />
                <span className="text-neutral-400 text-sm shrink-0">até</span>
                <input type="time" defaultValue="18:00" className="input-field py-2 flex-1 sm:max-w-[130px]" />
                <div className="w-10 h-5 bg-sage-500 rounded-full cursor-pointer shrink-0">
                  <div className="w-4 h-4 bg-white rounded-full shadow mt-0.5 translate-x-5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="section-title">Pagamento</h2>
        <div>
          <label className="label">Chave PIX</label>
          <input defaultValue={page.pixKey} className="input-field"
            placeholder="CPF, e-mail, telefone ou chave aleatória" />
        </div>
        <div>
          <label className="label">Mensagem de confirmação</label>
          <textarea defaultValue={page.confirmationMessage} rows={2}
            className="input-field resize-none"
            placeholder="Mensagem enviada após o agendamento..." />
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={save} className="btn-primary flex items-center gap-2">
          {saved ? <><Check className="w-4 h-4" />Salvo!</> : 'Salvar configurações'}
        </button>
      </div>
    </div>
  )
}
