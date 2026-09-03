import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Link2, Check, X, Wallet, Settings, Clock, RefreshCw, Trash2, MessageCircle, ExternalLink, Image, AlertCircle } from 'lucide-react'
import { copyText, formatCurrency, formatDateRelative } from '@/lib/utils'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { addDays, format, parseISO, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { openWhatsApp } from '@/lib/whatsapp'
import {
  useBookings, useBookingPage, useSaveBookingPage,
  useConfirmBooking, useRejectBooking, usePayBooking,
  useDailyBookingLink, useAvailability, useSaveAvailability,
  useSyncBookingAppointments, useBlockedDates, useAddBlockedDate, useAddBlockedWeek, useRemoveBlockedDate,
} from '@/hooks/useApi'
import { useTerms } from '@/hooks/useTerms'

const STATUS_CONFIG = {
  pending:   { label: 'Pendente',       className: 'bg-amber-100 text-amber-700'      },
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
  { v: 'pending',   l: 'Pendentes'   },
  { v: 'confirmed', l: 'Confirmados'},
  { v: 'cancelled', l: 'Cancelados' },
] as const

export default function BookingManagePage() {
  const t = useTerms()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState<'requests' | 'settings'>(
    searchParams.get('tab') === 'settings' ? 'settings' : 'requests'
  )
  const [filter, setFilter] = useState<string>('all')

  const { data: bookings = [], isLoading } = useBookings()
  const { data: bookingPage } = useBookingPage()
  const { data: dailyLink, refetch: refetchLink } = useDailyBookingLink()
  const confirmBooking = useConfirmBooking()
  const rejectBooking = useRejectBooking()
  const payBooking = usePayBooking()
  const syncAppointments = useSyncBookingAppointments()

  const appBaseUrl = new URL(import.meta.env.BASE_URL || '/', window.location.origin).toString()
  const bookingUrl = dailyLink?.url
    ?? (bookingPage?.slug ? `${appBaseUrl}agendar/${bookingPage.slug}` : '...')
  const bookingLinkIsActive = bookingPage?.isActive ?? true

  async function copyLink() {
    if (!bookingLinkIsActive) {
      toast('O link público está pausado.')
      return
    }
    try {
      await copyText(bookingUrl)
      toast.success('Link copiado!')
    } catch {
      toast.error('Não foi possível copiar automaticamente.')
    }
  }

  async function confirm(id: string) {
    await confirmBooking.mutateAsync(id)
    toast.success(`${t.sessionCapitalized} confirmada`)
  }

  async function reject(id: string) {
    await rejectBooking.mutateAsync(id)
    toast('Agendamento cancelado.')
  }

  async function markPaid(id: string) {
    await payBooking.mutateAsync({ id, method: 'outros' })
    toast.success('Pagamento registrado')
  }

  const filtered = filter === 'all' ? bookings : bookings.filter((b: any) => b.status === filter)

  return (
    <div className="animate-slide-up space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Agenda pública</h1>
          <p className="page-subtitle">Gerencie solicitações, horários e o link público de agendamento</p>
        </div>
        <button onClick={() => setTab(t => t === 'requests' ? 'settings' : 'requests')}
          className="btn-secondary flex items-center gap-2 text-sm shrink-0">
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">{tab === 'requests' ? 'Configurações' : 'Solicitações'}</span>
        </button>
      </div>

      {/* Link card */}
      <div className="card bg-gradient-to-r from-sage-500 to-sage-600 dark:from-sage-700 dark:to-sage-800 text-white border-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p className="text-sage-100 text-xs">Seu link fixo de agendamento</p>
          {dailyLink?.slug && (
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full text-white/90">
              usecognia.com.br/agendar/{dailyLink.slug}
            </span>
          )}
        </div>
        <p className="font-mono text-sm break-all mb-3">{bookingUrl}</p>
        <div className="flex gap-2 flex-wrap">
          <button onClick={copyLink}
            disabled={!bookingLinkIsActive}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60">
            <Link2 className="w-4 h-4" />Copiar
          </button>
          {dailyLink?.url && (
            <a href={bookingLinkIsActive ? bookingUrl : undefined} target="_blank" rel="noreferrer"
              className={cn(
                'bg-white text-sage-700 hover:bg-sage-50 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                !bookingLinkIsActive && 'pointer-events-none opacity-60',
              )}>
              {bookingLinkIsActive ? 'Visualizar' : 'Link pausado'}
            </a>
          )}
          <button onClick={() => refetchLink()}
            title="Recarregar link"
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
              { label: 'Pendentes',      value: bookings.filter((b: any) => b.status === 'pending').length,        icon: <Clock className="w-4 h-4 text-amber-500" /> },
              { label: 'Confirmados',    value: bookings.filter((b: any) => b.status === 'confirmed').length,      icon: <Check className="w-4 h-4 text-sage-500" />  },
              { label: 'Pag. pendentes', value: bookings.filter((b: any) => b.paymentStatus === 'pending').length, icon: <Wallet className="w-4 h-4 text-amber-500" /> },
            ].map(s => (
              <div key={s.label} className="card text-center p-3 lg:p-6 dark:border-sage-200/15">
                <div className="flex justify-center mb-1">{s.icon}</div>
                <p className="text-2xl font-bold text-neutral-800 dark:text-white">{s.value}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-300 mt-0.5 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Filtros */}
          <div className="flex gap-1 bg-neutral-100 dark:bg-black/20 p-1 rounded-xl overflow-x-auto scrollbar-none">
            {BOOKING_FILTERS.map(({ v, l }) => (
              <button key={v} onClick={() => setFilter(v)}
                className={`flex-none px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap ${
                  filter === v
                    ? 'bg-white dark:bg-sage-500/25 text-neutral-800 dark:text-sage-100 shadow-sm font-medium'
                    : 'text-neutral-500 dark:text-neutral-300 hover:text-neutral-700 dark:hover:text-white'
                }`}>
                {l}
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={async () => {
                try {
                  await syncAppointments.mutateAsync()
                  toast.success('Agendamentos sincronizados.')
                } catch {
                  toast.error('Não foi possível sincronizar agora.')
                }
              }}
              disabled={syncAppointments.isPending}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <RefreshCw className={cn('w-4 h-4', syncAppointments.isPending && 'animate-spin')} />
              Sincronizar confirmados
            </button>
          </div>

          {/* Lista */}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => <div key={i} className="h-28 bg-neutral-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.length === 0
                ? <div className="card text-center py-10 text-neutral-400 text-sm">Nenhum agendamento aqui.</div>
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

// ─── Card de agendamento ──────────────────────────────────────────────────────
function BookingCard({ booking, onConfirm, onReject, onMarkPaid }: {
  booking: any
  onConfirm: (id: string) => void
  onReject:  (id: string) => void
  onMarkPaid:(id: string) => void
}) {
  const s = STATUS_CONFIG[booking.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending
  const p = PAY_CONFIG[booking.paymentStatus as keyof typeof PAY_CONFIG] ?? PAY_CONFIG.pending
  const [messageModalOpen, setMessageModalOpen] = useState(false)
  const [messageDraft, setMessageDraft] = useState('')

  // Usado só na mensagem de WhatsApp pro paciente (defaultPatientMessage/insertCancellationLink) — utm_source fixo aqui é seguro.
  function getCancellationUrl() {
    const token = booking.cancellationCode ?? booking.confirmationToken
    if (!token) return ''

    const appBaseUrl = new URL(import.meta.env.BASE_URL || '/', window.location.origin).toString()
    const path = booking.cancellationCode ? `c/${token}` : `agendar/cancelar/${token}`
    return `${appBaseUrl}${path}?utm_source=whatsapp&utm_medium=message`
  }

  function defaultPatientMessage() {
    const first = booking.patientName?.split(' ')[0] ?? ''
    const cancelUrl = getCancellationUrl()
    const cancelLine = cancelUrl ? `\n\nSe precisar cancelar, use este link:\n${cancelUrl}` : ''

    return booking.status === 'confirmed'
      ? `Ola, ${first}! Sua sessao esta confirmada para ${formatDateRelative(booking.date)} as ${booking.time}.${cancelLine}`
      : `Ola, ${first}! Recebi seu agendamento para ${formatDateRelative(booking.date)} as ${booking.time}. Ja retorno com os detalhes.${cancelLine}`
  }

  function messagePatient() {
    if (!booking.patientPhone) {
      toast.error('Essa pessoa nao informou WhatsApp.')
      return
    }

    setMessageDraft(defaultPatientMessage())
    setMessageModalOpen(true)
  }

  function insertCancellationLink() {
    const cancelUrl = getCancellationUrl()
    if (!cancelUrl) {
      toast.error('Este agendamento ainda nao tem link de cancelamento.')
      return
    }
    setMessageDraft(current => current.includes(cancelUrl)
      ? current
      : `${current.trim()}\n\nLink de cancelamento:\n${cancelUrl}`)
  }

  return (
    <div className="card space-y-3 p-4 dark:border-sage-200/15">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-medium text-neutral-800 dark:text-white">{booking.patientName}</h3>
          <span className={cn('badge', s.className)}>{s.label}</span>
          <span className={cn('badge', p.className)}>{p.label}</span>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-300 mt-0.5">
          {booking.patientEmail}
          {booking.patientPhone && ` · ${booking.patientPhone}`}
        </p>
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200 mt-1.5">
          {formatDateRelative(booking.date)} às {booking.time} · {booking.duration}min · {formatCurrency(booking.amount)}
        </p>
        {booking.patientNotes && (
          <p className="text-sm text-neutral-500 dark:text-neutral-300 mt-2 bg-neutral-50 dark:bg-black/20 rounded-xl px-3 py-2">
            💬 "{booking.patientNotes}"
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={messagePatient}
          className="btn-secondary text-sm py-2 flex items-center gap-1.5">
          <MessageCircle className="w-3.5 h-3.5" />WhatsApp
        </button>
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

      {messageModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/35 px-4 backdrop-blur-[1px]">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-neutral-800">Enviar mensagem</h2>
                <p className="text-sm text-neutral-400">Revise antes de abrir no WhatsApp.</p>
              </div>
              <button
                type="button"
                onClick={() => setMessageModalOpen(false)}
                className="rounded-lg p-2 text-neutral-300 hover:bg-neutral-50 hover:text-neutral-500"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="label">Mensagem para {booking.patientName}</label>
            <textarea
              value={messageDraft}
              onChange={e => setMessageDraft(e.target.value)}
              rows={7}
              className="input-field min-h-[160px]"
            />

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={insertCancellationLink}
                className="btn-secondary text-sm"
              >
                Inserir link de cancelamento
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMessageModalOpen(false)}
                  className="btn-secondary text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    openWhatsApp(booking.patientPhone, messageDraft)
                    setMessageModalOpen(false)
                  }}
                  disabled={!messageDraft.trim()}
                  className="btn-primary text-sm disabled:opacity-50"
                >
                  Abrir WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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

type TimeRange = { startTime: string; endTime: string }
type DaySlot = { enabled: boolean; ranges: TimeRange[] }
type BookingModality = 'presencial' | 'online'

const MODALITIES: { key: BookingModality; label: string }[] = [
  { key: 'presencial', label: 'Presencial' },
  { key: 'online', label: 'Online' },
]

function createEmptySchedule(): Record<number, DaySlot> {
  const base: Record<number, DaySlot> = {}
  WEEKDAYS.forEach(({ d }) => {
    base[d] = { enabled: false, ranges: [{ startTime: '09:00', endTime: '18:00' }] }
  })
  return base
}

function normalizeSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function initialBreakInterval(page: any, modality: BookingModality): number {
  const duration = modality === 'presencial'
    ? +(page?.presencialSessionDuration ?? page?.sessionDuration ?? 50)
    : +(page?.onlineSessionDuration ?? page?.sessionDuration ?? 50)
  const explicitBreak = modality === 'presencial'
    ? page?.presencialSlotInterval
    : page?.onlineSlotInterval

  if (explicitBreak !== undefined && explicitBreak !== null) return +explicitBreak
  return Math.max(+(page?.slotInterval ?? duration) - duration, 0)
}

function BookingSettings({ page }: { page: any }) {
  const t = useTerms()
  const saveBookingPage = useSaveBookingPage()
  const { data: savedSlots = [] } = useAvailability()
  const saveAvailability = useSaveAvailability()
  const { data: blockedDates = [] } = useBlockedDates()
  const addBlockedDate = useAddBlockedDate()
  const addBlockedWeek = useAddBlockedWeek()
  const removeBlockedDate = useRemoveBlockedDate()
  const [blockedForm, setBlockedForm] = useState<{ date: string; reason: string; scope: 'day' | 'week' }>({
    date: '',
    reason: '',
    scope: 'day',
  })
  const [form, setForm] = useState({
    isActive:           page?.isActive ?? true,
    slug:               page?.slug ?? '',
    title:               page?.title ?? `Agende sua ${t.session}`,
    avatarUrl:           page?.avatarUrl ?? '',
    description:         page?.description ?? '',
    // +() converte string "150.00" do PostgreSQL decimal para número
    sessionPrice:        +(page?.sessionPrice ?? 150),
    sessionDuration:     +(page?.sessionDuration ?? 50),
    presencialSessionDuration: +(page?.presencialSessionDuration ?? page?.sessionDuration ?? 50),
    onlineSessionDuration:     +(page?.onlineSessionDuration ?? page?.sessionDuration ?? 50),
    slotInterval:        +(page?.slotInterval ?? 50),
    presencialSlotInterval: initialBreakInterval(page, 'presencial'),
    onlineSlotInterval:     initialBreakInterval(page, 'online'),
    minAdvanceDays:      +(page?.minAdvanceDays ?? 0),
    allowNextMonthBooking: page?.allowNextMonthBooking ?? false,
    pixKey:              page?.pixKey ?? '',
    confirmationMessage: page?.confirmationMessage ?? '',
    allowPresencial:     page?.allowPresencial ?? true,
    allowOnline:         page?.allowOnline ?? true,
  })

  useEffect(() => {
    if (!page) return
    setForm({
      isActive:           page.isActive ?? true,
      slug:               page.slug ?? '',
      title:               page.title ?? `Agende sua ${t.session}`,
      avatarUrl:           page.avatarUrl ?? '',
      description:         page.description ?? '',
      sessionPrice:        +(page.sessionPrice ?? 150),
      sessionDuration:     +(page.sessionDuration ?? 50),
      presencialSessionDuration: +(page.presencialSessionDuration ?? page.sessionDuration ?? 50),
      onlineSessionDuration:     +(page.onlineSessionDuration ?? page.sessionDuration ?? 50),
      slotInterval:        +(page.slotInterval ?? 50),
      presencialSlotInterval: initialBreakInterval(page, 'presencial'),
      onlineSlotInterval:     initialBreakInterval(page, 'online'),
      minAdvanceDays:      +(page.minAdvanceDays ?? 0),
      allowNextMonthBooking: page.allowNextMonthBooking ?? false,
      pixKey:              page.pixKey ?? '',
      confirmationMessage: page.confirmationMessage ?? '',
      allowPresencial:     page.allowPresencial ?? true,
      allowOnline:         page.allowOnline ?? true,
    })
  }, [page])

  // Horários por dia da semana
  const [scheduleTab, setScheduleTab] = useState<BookingModality>('presencial')
  const [schedules, setSchedules] = useState<Record<BookingModality, Record<number, DaySlot>>>(() => ({
    presencial: createEmptySchedule(),
    online: createEmptySchedule(),
  }))

  // Preenche schedule quando os slots chegam da API
  useEffect(() => {
    if (!savedSlots.length) return
    const next: Record<BookingModality, Record<number, DaySlot>> = {
      presencial: createEmptySchedule(),
      online: createEmptySchedule(),
    }
    MODALITIES.forEach(({ key }) => {
      WEEKDAYS.forEach(({ d }) => {
        const daySlots = savedSlots.filter(s => s.weekday === d && (s.modality ?? 'online') === key)
        next[key][d] = daySlots.length
          ? { enabled: true, ranges: daySlots.map(s => ({ startTime: s.startTime.slice(0, 5), endTime: s.endTime.slice(0, 5) })) }
          : { enabled: false, ranges: [{ startTime: '09:00', endTime: '18:00' }] }
      })
    })
    setSchedules(next)
  }, [savedSlots])

  function toggleDay(d: number) {
    setSchedules(s => ({
      ...s,
      [scheduleTab]: {
        ...s[scheduleTab],
        [d]: { ...s[scheduleTab][d], enabled: !s[scheduleTab][d].enabled },
      },
    }))
  }
  function setRangeTime(d: number, i: number, field: 'startTime' | 'endTime', val: string) {
    setSchedules(s => {
      const ranges = s[scheduleTab][d].ranges.map((r, idx) => idx === i ? { ...r, [field]: val } : r)
      return { ...s, [scheduleTab]: { ...s[scheduleTab], [d]: { ...s[scheduleTab][d], ranges } } }
    })
  }
  function addRange(d: number) {
    setSchedules(s => {
      const arr = s[scheduleTab][d].ranges
      const last = arr[arr.length - 1] ?? { startTime: '09:00', endTime: '18:00' }
      const ranges = [...s[scheduleTab][d].ranges, { startTime: last.endTime, endTime: last.endTime }]
      return { ...s, [scheduleTab]: { ...s[scheduleTab], [d]: { ...s[scheduleTab][d], ranges } } }
    })
  }
  function removeRange(d: number, i: number) {
    setSchedules(s => {
      const ranges = s[scheduleTab][d].ranges.filter((_, idx) => idx !== i)
      return { ...s, [scheduleTab]: { ...s[scheduleTab], [d]: { ...s[scheduleTab][d], ranges } } }
    })
  }

  function minutes(time: string) {
    const [hours, mins] = time.split(':').map(Number)
    return hours * 60 + mins
  }

  function validateSettings() {
    if (!form.allowPresencial && !form.allowOnline) {
      toast.error('Ative pelo menos uma modalidade.')
      return false
    }
    if (form.slug && normalizeSlug(form.slug).length < 3) {
      toast.error('A URL precisa ter pelo menos 3 caracteres.')
      return false
    }
    if (form.avatarUrl.trim()) {
      try {
        new URL(form.avatarUrl.trim())
      } catch {
        toast.error('Informe uma URL valida para a foto do perfil publico.')
        return false
      }
    }
    if (form.presencialSessionDuration < 15 || form.presencialSessionDuration > 240) {
      toast.error('A duração presencial precisa ficar entre 15 e 240 minutos.')
      return false
    }
    if (form.onlineSessionDuration < 15 || form.onlineSessionDuration > 240) {
      toast.error('A duração online precisa ficar entre 15 e 240 minutos.')
      return false
    }
    if (form.presencialSlotInterval < 0 || form.presencialSlotInterval > 180) {
      toast.error('A pausa presencial precisa ficar entre 0 e 180 minutos.')
      return false
    }
    if (form.onlineSlotInterval < 0 || form.onlineSlotInterval > 180) {
      toast.error('A pausa online precisa ficar entre 0 e 180 minutos.')
      return false
    }
    if (form.minAdvanceDays < 0 || form.minAdvanceDays > 30) {
      toast.error('A antecedência mínima precisa ficar entre 0 e 30 dias.')
      return false
    }
    const invalidSlot = MODALITIES.flatMap(({ key }) =>
      WEEKDAYS
        .filter(({ d }) => schedules[key][d]?.enabled)
        .flatMap(({ d, label }) => schedules[key][d].ranges.map(r => ({ modality: key, label, range: r }))),
    ).find(({ modality, range }) => {
      const start = minutes(range.startTime)
      const end = minutes(range.endTime)
      const duration = modality === 'presencial' ? form.presencialSessionDuration : form.onlineSessionDuration
      return start >= end || end - start < duration
    })

    if (invalidSlot) {
      toast.error(`Revise ${invalidSlot.label} em ${invalidSlot.modality}: horário insuficiente para a duração da ${t.session}.`)
      return false
    }

    return true
  }

  async function save() {
    try {
      // Salva configurações gerais
      if (!validateSettings()) return
      await saveBookingPage.mutateAsync({
        ...form,
        slug: normalizeSlug(form.slug),
        avatarUrl: form.avatarUrl.trim() || undefined,
        sessionDuration: form.onlineSessionDuration,
        slotInterval: form.onlineSessionDuration + form.onlineSlotInterval,
      })
      // Salva horários de disponibilidade
      const slots = MODALITIES.flatMap(({ key }) =>
        WEEKDAYS
          .filter(({ d }) => schedules[key][d]?.enabled)
          .flatMap(({ d }) => schedules[key][d].ranges.map(r => ({
            weekday: d,
            modality: key,
            startTime: r.startTime,
            endTime: r.endTime,
          }))),
      )
      await saveAvailability.mutateAsync(slots)
      toast.success('Configurações salvas')
    } catch {
      toast.error('Erro ao salvar. Tente novamente.')
    }
  }

  async function blockDate() {
    if (!blockedForm.date) {
      toast.error('Escolha uma data para bloquear.')
      return
    }
    try {
      const payload = {
        date: blockedForm.date,
        reason: blockedForm.reason.trim() || undefined,
      }
      if (blockedForm.scope === 'week') {
        await addBlockedWeek.mutateAsync(payload)
      } else {
        await addBlockedDate.mutateAsync(payload)
      }
      setBlockedForm(form => ({ ...form, date: '', reason: '' }))
      toast.success(blockedForm.scope === 'week' ? 'Semana bloqueada.' : 'Data bloqueada.')
    } catch {
      toast.error(blockedForm.scope === 'week' ? 'Erro ao bloquear semana.' : 'Erro ao bloquear data.')
    }
  }


  const selectedWeekStart = blockedForm.date
    ? startOfWeek(parseISO(blockedForm.date), { weekStartsOn: 1 })
    : null

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const isSaving = saveBookingPage.isPending || saveAvailability.isPending

  async function togglePublicLink() {
    const nextIsActive = !form.isActive
    const previousIsActive = form.isActive
    set('isActive', nextIsActive)
    try {
      await saveBookingPage.mutateAsync({ isActive: nextIsActive })
      toast.success(nextIsActive ? 'Link público ativado.' : 'Link público pausado.')
    } catch {
      set('isActive', previousIsActive)
      toast.error('Não foi possível alterar o status do link.')
    }
  }

  const currentSchedule = schedules[scheduleTab]
  const enabledCount = WEEKDAYS.filter(({ d }) => currentSchedule[d]?.enabled).length
  const totalEnabledSlots = MODALITIES.reduce(
    (total, { key }) => total + WEEKDAYS.filter(({ d }) => schedules[key][d]?.enabled).length,
    0,
  )
  const normalizedSlug = normalizeSlug(form.slug || page?.slug || '')
  const publicUrl = normalizedSlug ? `${window.location.origin}/agendar/${normalizedSlug}` : ''
  const displayName = page?.psychologistName || page?.name || 'Seu perfil'
  const profileInitial = displayName.trim().charAt(0).toUpperCase() || 'U'
  const setupItems = [
    {
      label: 'Link publico ativo',
      done: form.isActive,
      hint: form.isActive ? `${t.patientsCapitalized} conseguem acessar.` : 'Ative quando quiser receber agendamentos.',
    },
    {
      label: 'URL personalizada',
      done: normalizedSlug.length >= 3,
      hint: normalizedSlug ? `/agendar/${normalizedSlug}` : 'Crie um link facil de compartilhar.',
    },
    {
      label: 'Perfil com foto ou texto',
      done: Boolean(form.avatarUrl.trim() || form.description.trim()),
      hint: `Ajuda o ${t.patient} a reconhecer o profissional.`,
    },
    {
      label: 'Modalidade escolhida',
      done: form.allowPresencial || form.allowOnline,
      hint: [form.allowPresencial && 'presencial', form.allowOnline && 'online'].filter(Boolean).join(' e ') || 'Escolha pelo menos uma.',
    },
    {
      label: 'Horarios cadastrados',
      done: totalEnabledSlots > 0,
      hint: totalEnabledSlots > 0 ? `${totalEnabledSlots} dias/modalidades ativos.` : 'Sem horarios, o link nao mostra datas.',
    },
  ]
  const isSetupReady = setupItems.every(item => item.done)

  return (
    <div className="space-y-5">
      <div className="card space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="section-title mb-1">Preparar link publico</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-300">
              Mantemos suas configuracoes atuais e mostramos apenas o que pode melhorar antes de enviar o link para {t.patients}.
            </p>
          </div>
          <span className={cn(
            'inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
            isSetupReady
              ? 'bg-sage-100 text-sage-700 dark:bg-sage-500/20 dark:text-sage-100'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-100',
          )}>
            {isSetupReady ? <Check className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
            {isSetupReady ? 'Pronto para compartilhar' : 'Revise os pontos pendentes'}
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          {setupItems.map(item => (
            <div
              key={item.label}
              className={cn(
                'rounded-xl border p-3 transition-colors',
                item.done
                  ? 'border-sage-200 bg-sage-50 dark:border-sage-400/30 dark:bg-sage-500/10'
                  : 'border-amber-200 bg-amber-50 dark:border-amber-400/30 dark:bg-amber-500/10',
              )}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full',
                  item.done ? 'bg-sage-500 text-white' : 'bg-amber-500 text-white',
                )}>
                  {item.done ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                </span>
                <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-100">{item.label}</p>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-300">{item.hint}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="section-title mb-1">Status do link público</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-300">
              {form.isActive
                ? `${t.patientsCapitalized} conseguem acessar e reservar horários pelo seu link.`
                : `O link fica pausado e ${t.patients} não conseguem agendar.`}
            </p>
          </div>
          <button
            type="button"
            onClick={togglePublicLink}
            disabled={saveBookingPage.isPending}
            className={cn(
              'h-10 rounded-xl px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
              form.isActive
                ? 'bg-sage-600 text-white hover:bg-sage-700'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
            )}
          >
            {saveBookingPage.isPending ? 'Salvando...' : form.isActive ? 'Link ativo' : 'Link pausado'}
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label className="label">URL pública</label>
            <div className="flex overflow-hidden rounded-xl border border-neutral-200 bg-white focus-within:border-sage-300 dark:border-white/10 dark:bg-white/5 dark:focus-within:border-sage-400/60">
              <span className="hidden items-center border-r border-neutral-100 bg-neutral-50 px-3 text-sm text-neutral-400 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300 sm:flex">
                usecognia.com.br/agendar/
              </span>
              <input
                value={form.slug}
                onChange={e => set('slug', normalizeSlug(e.target.value))}
                className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-neutral-800 outline-none placeholder:text-neutral-400 dark:text-white dark:placeholder:text-neutral-500"
                placeholder="nicolle-paes"
              />
            </div>
            <p className="mt-1 text-xs text-neutral-400">Use letras, números e hífens. Ex: nicolle-paes.</p>
          </div>
          <a
            href={form.isActive && publicUrl ? publicUrl : undefined}
            target="_blank"
            rel="noreferrer"
            className={cn('btn-secondary flex items-center justify-center gap-2 text-sm', (!publicUrl || !form.isActive) && 'pointer-events-none opacity-50')}
          >
            <ExternalLink className="h-4 w-4" />
            {form.isActive ? `Visualizar como ${t.patient}` : 'Link pausado'}
          </a>
        </div>
      </div>

      {/* ── Horários de atendimento ─────────────────── */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Horários de atendimento</h2>
          {enabledCount === 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-lg">
              Nenhum dia configurado — slots não aparecerão
            </span>
          )}
        </div>
        <p className="text-xs text-neutral-400">Selecione os dias e defina o início/fim do expediente. Os horários são gerados pela duração da consulta somada à pausa configurada.</p>

        <div className="flex gap-1 bg-neutral-100 dark:bg-black/20 p-1 rounded-xl">
          {MODALITIES.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setScheduleTab(key)}
              className={cn(
                'flex-1 h-9 rounded-lg text-sm font-medium transition-colors',
                scheduleTab === key
                  ? 'bg-white dark:bg-sage-500/25 text-neutral-800 dark:text-sage-100 shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-300 hover:text-neutral-700 dark:hover:text-white',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {WEEKDAYS.map(({ d, label }) => {
            const slot = currentSchedule[d]
            return (
              <div key={d} className={cn(
                'flex items-start gap-3 p-3 rounded-xl border transition-all',
                slot.enabled
                  ? 'border-sage-200 dark:border-sage-400/40 bg-sage-50 dark:bg-sage-500/15'
                  : 'border-neutral-100 dark:border-white/10 bg-neutral-50 dark:bg-black/15'
              )}>
                {/* Toggle */}
                <button type="button" onClick={() => toggleDay(d)}
                  className={cn(
                    'w-11 h-6 rounded-full transition-colors shrink-0 mt-0.5',
                    slot.enabled ? 'bg-sage-500' : 'bg-neutral-200 dark:bg-white/20'
                  )}>
                  <div className={cn(
                    'w-5 h-5 bg-white rounded-full shadow transition-transform mt-0.5 mx-0.5',
                    slot.enabled ? 'translate-x-5' : ''
                  )} />
                </button>

                <span className={cn('w-8 text-sm font-medium shrink-0 pt-1', slot.enabled ? 'text-sage-700 dark:text-sage-200' : 'text-neutral-400 dark:text-neutral-300')}>
                  {label}
                </span>

                {slot.enabled ? (
                  <div className="flex flex-wrap items-start gap-2 flex-1">
                    {slot.ranges.map((range, i) => (
                      <div key={i} className="flex items-center gap-1.5 bg-white dark:bg-black/20 border border-neutral-200 dark:border-white/10 rounded-lg px-2 py-1.5">
                        <input
                          type="time" value={range.startTime}
                          onChange={e => setRangeTime(d, i, 'startTime', e.target.value)}
                          className="text-sm text-neutral-700 dark:text-neutral-200 bg-transparent border-none outline-none w-[4.5rem]"
                        />
                        <span className="text-neutral-300 text-xs">–</span>
                        <input
                          type="time" value={range.endTime}
                          onChange={e => setRangeTime(d, i, 'endTime', e.target.value)}
                          className="text-sm text-neutral-700 dark:text-neutral-200 bg-transparent border-none outline-none w-[4.5rem]"
                        />
                        {slot.ranges.length > 1 && (
                          <button type="button" onClick={() => removeRange(d, i)}
                            className="ml-0.5 text-neutral-300 hover:text-rose-400 transition-colors text-xs leading-none">
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={() => addRange(d)}
                      className="h-8 w-8 rounded-lg border border-dashed border-sage-300 dark:border-sage-500/40 text-sage-500 hover:bg-sage-100 dark:hover:bg-sage-500/20 transition-colors flex items-center justify-center text-lg leading-none">
                      +
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-neutral-400 flex-1 pt-1">Indisponível</span>
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
          <input maxLength={90} value={form.title} onChange={e => set('title', e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="label">Foto do perfil publico</label>
          <div className="flex gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-neutral-50 text-sm font-semibold text-neutral-500 dark:border-white/10 dark:bg-black/20 dark:text-neutral-200">
              {form.avatarUrl.trim()
                ? <img src={form.avatarUrl.trim()} alt="" className="h-full w-full object-cover" />
                : <Image className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <input
                maxLength={500}
                value={form.avatarUrl}
                onChange={e => set('avatarUrl', e.target.value)}
                className="input-field"
                placeholder="https://..."
              />
              <p className="mt-1 text-xs text-neutral-400">Opcional. Use uma URL publica da foto profissional que vai aparecer no link de agendamento.</p>
            </div>
          </div>
        </div>
        <div>
          <label className="label">Mensagem de boas-vindas</label>
          <textarea maxLength={600} value={form.description} onChange={e => set('description', e.target.value)} rows={3} className="input-field resize-none" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Valor da {t.session} (R$)</label>
            <input type="number" value={form.sessionPrice} onChange={e => set('sessionPrice', +e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label">Duração presencial (min)</label>
            <input
              type="number"
              min={15}
              max={240}
              value={form.presencialSessionDuration}
              onChange={e => set('presencialSessionDuration', +e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Duração online (min)</label>
            <input
              type="number"
              min={15}
              max={240}
              value={form.onlineSessionDuration}
              onChange={e => set('onlineSessionDuration', +e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Pausa presencial (min)</label>
            <input
              type="number"
              min={0}
              max={180}
              value={form.presencialSlotInterval}
              onChange={e => set('presencialSlotInterval', +e.target.value)}
              className="input-field"
            />
            <p className="text-xs text-neutral-400 mt-1">Use 0 para uma consulta começar logo após a outra.</p>
          </div>
          <div>
            <label className="label">Pausa online (min)</label>
            <input
              type="number"
              min={0}
              max={180}
              value={form.onlineSlotInterval}
              onChange={e => set('onlineSlotInterval', +e.target.value)}
              className="input-field"
            />
            <p className="text-xs text-neutral-400 mt-1">Pode ser 0 quando não houver pausa entre atendimentos.</p>
          </div>
          <div>
            <label className="label">Antecedência mínima (dias)</label>
            <input type="number" min={0} max={30} value={form.minAdvanceDays} onChange={e => set('minAdvanceDays', +e.target.value)} className="input-field" />
            <p className="text-xs text-neutral-400 mt-1">Ex: 1 impede agendamento para hoje.</p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={form.allowNextMonthBooking}
          onClick={() => set('allowNextMonthBooking', !form.allowNextMonthBooking)}
          className={cn(
            'flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition-colors',
            form.allowNextMonthBooking
              ? 'border-sage-300 bg-sage-50 dark:border-sage-400/40 dark:bg-sage-500/15'
              : 'border-neutral-200 bg-neutral-50 dark:border-white/10 dark:bg-black/15',
          )}
        >
          <span>
            <span className="block text-sm font-semibold text-neutral-800 dark:text-neutral-100">
              Liberar agendamentos para o próximo mês
            </span>
            <span className="mt-1 block text-xs text-neutral-500 dark:text-neutral-300">
              O mês atual fica sempre disponível. Meses posteriores ao próximo continuam bloqueados.
            </span>
          </span>
          <span className={cn(
            'relative h-6 w-11 shrink-0 rounded-full transition-colors',
            form.allowNextMonthBooking ? 'bg-sage-600' : 'bg-neutral-300 dark:bg-neutral-600',
          )}>
            <span className={cn(
              'absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
              form.allowNextMonthBooking ? 'translate-x-6' : 'translate-x-1',
            )} />
          </span>
        </button>
        <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4 dark:border-white/10 dark:bg-black/15">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">Previa do link publico</p>
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-950">
            <div className="flex items-start gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sage-100 text-lg font-bold text-sage-700 dark:bg-sage-500/20 dark:text-sage-100">
                {form.avatarUrl.trim()
                  ? <img src={form.avatarUrl.trim()} alt="" className="h-full w-full object-cover" />
                  : profileInitial}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{displayName}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-300">{form.title || `Agende sua ${t.session}`}</p>
                {form.description.trim() && (
                  <p className="mt-2 line-clamp-3 text-xs text-neutral-500 dark:text-neutral-300">{form.description.trim()}</p>
                )}
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl bg-neutral-50 px-3 py-2 text-xs text-neutral-500 dark:bg-white/5 dark:text-neutral-300">
                {formatCurrency(form.sessionPrice)}
              </div>
              <div className="rounded-xl bg-neutral-50 px-3 py-2 text-xs text-neutral-500 dark:bg-white/5 dark:text-neutral-300">
                {form.allowNextMonthBooking ? 'Mês atual + próximo' : 'Somente mês atual'}
              </div>
              <div className="rounded-xl bg-neutral-50 px-3 py-2 text-xs text-neutral-500 dark:bg-white/5 dark:text-neutral-300">
                {[form.allowPresencial && 'Presencial', form.allowOnline && 'Online'].filter(Boolean).join(' / ') || 'Sem modalidade'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Pagamento ───────────────────────────────── */}
      <div className="card space-y-4">
        <h2 className="section-title">Modalidades</h2>
        <div>
          <label className="label">Modalidades aceitas no link público</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'allowPresencial', label: 'Presencial' },
              { key: 'allowOnline', label: 'Online' },
            ].map((item) => {
              const checked = Boolean((form as any)[item.key])
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => set(item.key, !checked)}
                  className={cn(
                    'h-11 rounded-xl border text-sm font-medium transition-colors',
                    checked
                      ? 'border-sage-300 dark:border-sage-400/50 bg-sage-50 dark:bg-sage-500/20 text-sage-700 dark:text-sage-100'
                      : 'border-neutral-200 dark:border-white/10 bg-white dark:bg-black/15 text-neutral-500 dark:text-neutral-300',
                  )}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
          {!form.allowPresencial && !form.allowOnline && (
            <p className="text-xs text-rose-500 mt-1">Ative pelo menos uma modalidade para receber agendamentos.</p>
          )}
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="section-title">Datas bloqueadas</h2>
        <p className="text-xs text-neutral-400">Férias, feriados e dias sem atendimento não aparecem como disponíveis no link público.</p>
        <div className="inline-flex w-full rounded-xl bg-neutral-100 p-1 dark:bg-black/20 sm:w-auto">
          {([
            { value: 'day', label: 'Bloquear um dia' },
            { value: 'week', label: 'Bloquear uma semana' },
          ] as const).map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => setBlockedForm(form => ({ ...form, scope: option.value }))}
              className={cn(
                'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors sm:flex-none',
                blockedForm.scope === option.value
                  ? 'bg-white text-neutral-800 shadow-sm dark:bg-sage-500/25 dark:text-sage-100'
                  : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-300 dark:hover:text-white',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr_auto] gap-3">
          <input
            type="date"
            value={blockedForm.date}
            onChange={e => setBlockedForm(f => ({ ...f, date: e.target.value }))}
            className="input-field"
          />
          <input
            maxLength={255}
            value={blockedForm.reason}
            onChange={e => setBlockedForm(f => ({ ...f, reason: e.target.value }))}
            className="input-field"
            placeholder={blockedForm.scope === 'week' ? 'Motivo da semana (opcional)' : 'Motivo opcional'}
          />
          <button
            type="button"
            onClick={blockDate}
            disabled={addBlockedDate.isPending || addBlockedWeek.isPending}
            className="btn-secondary text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {addBlockedDate.isPending || addBlockedWeek.isPending
              ? 'Bloqueando...'
              : blockedForm.scope === 'week' ? 'Bloquear semana' : 'Bloquear dia'}
          </button>
        </div>
        {blockedForm.scope === 'week' && selectedWeekStart && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100">
            A semana de {format(selectedWeekStart, 'dd/MM', { locale: ptBR })} a{' '}
            {format(addDays(selectedWeekStart, 6), 'dd/MM/yyyy', { locale: ptBR })} será bloqueada.
            Agendamentos já confirmados não serão cancelados.
          </div>
        )}
        <div className="space-y-2">
          {blockedDates.length === 0 ? (
            <p className="text-sm text-neutral-400 py-2">Nenhuma data bloqueada.</p>
          ) : blockedDates.map((blocked) => (
            <div key={blocked.id} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-100 dark:border-white/10 dark:bg-black/15 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-neutral-700">
                  {new Date(`${blocked.date}T00:00:00`).toLocaleDateString('pt-BR')}
                </p>
                {blocked.reason && <p className="text-xs text-neutral-400">{blocked.reason}</p>}
              </div>
              <button
                type="button"
                onClick={() => removeBlockedDate.mutateAsync(blocked.id)}
                className="p-2 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50"
                title="Remover bloqueio"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="section-title">Pagamento</h2>
        <div>
          <label className="label">Chave PIX</label>
          <input maxLength={180} value={form.pixKey} onChange={e => set('pixKey', e.target.value)} className="input-field"
            placeholder="CPF, e-mail, telefone ou chave aleatória" />
        </div>
        <div>
          <label className="label">Mensagem de confirmação</label>
          <textarea maxLength={500} value={form.confirmationMessage} onChange={e => set('confirmationMessage', e.target.value)} rows={2}
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
