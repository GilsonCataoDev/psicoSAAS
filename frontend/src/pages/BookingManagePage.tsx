import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Link2, Check, X, Wallet, Settings, Clock, RefreshCw, Trash2, MessageCircle, ExternalLink } from 'lucide-react'
import { copyText, formatCurrency, formatDateRelative } from '@/lib/utils'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { openWhatsApp } from '@/lib/whatsapp'
import {
  useBookings, useBookingPage, useSaveBookingPage,
  useConfirmBooking, useRejectBooking, usePayBooking,
  useDailyBookingLink, useAvailability, useSaveAvailability,
  useSyncBookingAppointments, useBlockedDates, useAddBlockedDate, useRemoveBlockedDate,
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

  async function copyLink() {
    try {
      await copyText(bookingUrl)
      toast.success('Link copiado!')
    } catch {
      toast.error('Não foi possível copiar automaticamente.')
    }
  }

  async function confirm(id: string) {
    await confirmBooking.mutateAsync(id)
    toast.success('Sessão confirmada')
  }

  async function reject(id: string) {
    await rejectBooking.mutateAsync(id)
    toast('Solicitacao recusada.')
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
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
            <Link2 className="w-4 h-4" />Copiar
          </button>
          {dailyLink?.url && (
            <a href={bookingUrl} target="_blank" rel="noreferrer"
              className="bg-white text-sage-700 hover:bg-sage-50 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
              Visualizar
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
              { label: 'Aguardando',     value: bookings.filter((b: any) => b.status === 'pending').length,        icon: <Clock className="w-4 h-4 text-amber-500" /> },
              { label: 'Confirmados',    value: bookings.filter((b: any) => b.status === 'confirmed').length,      icon: <Check className="w-4 h-4 text-sage-500" />  },
              { label: 'Pag. pendentes', value: bookings.filter((b: any) => b.paymentStatus === 'pending').length, icon: <Wallet className="w-4 h-4 text-amber-500" /> },
            ].map(s => (
              <div key={s.label} className="card text-center p-3 lg:p-6 dark:border-sage-200/15">
                <div className="flex justify-center mb-1">{s.icon}</div>
                <p className="text-2xl font-bold text-neutral-800">{s.value}</p>
                <p className="text-xs text-neutral-500 mt-0.5 leading-tight">{s.label}</p>
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

  function messagePatient() {
    if (!booking.patientPhone) {
      toast.error('Essa pessoa não informou WhatsApp.')
      return
    }

    const first = booking.patientName?.split(' ')[0] ?? ''
    const text = booking.status === 'confirmed'
      ? `Olá, ${first}! Sua sessão está confirmada para ${formatDateRelative(booking.date)} às ${booking.time}. Até lá!`
      : `Olá, ${first}! Recebi sua solicitação para ${formatDateRelative(booking.date)} às ${booking.time}. Já retorno para confirmar.`
    openWhatsApp(booking.patientPhone, text)
  }

  return (
    <div className="card space-y-3 p-4 dark:border-sage-200/15">
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
type BookingModality = 'presencial' | 'online'

const MODALITIES: { key: BookingModality; label: string }[] = [
  { key: 'presencial', label: 'Presencial' },
  { key: 'online', label: 'Online' },
]

function createEmptySchedule(): Record<number, DaySlot> {
  const base: Record<number, DaySlot> = {}
  WEEKDAYS.forEach(({ d }) => {
    base[d] = { enabled: false, startTime: '09:00', endTime: '18:00' }
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
  const saveBookingPage = useSaveBookingPage()
  const { data: savedSlots = [] } = useAvailability()
  const saveAvailability = useSaveAvailability()
  const { data: blockedDates = [] } = useBlockedDates()
  const addBlockedDate = useAddBlockedDate()
  const removeBlockedDate = useRemoveBlockedDate()
  const [blockedForm, setBlockedForm] = useState({ date: '', reason: '' })

  const [form, setForm] = useState({
    isActive:           page?.isActive ?? true,
    slug:               page?.slug ?? '',
    title:               page?.title ?? 'Agende sua sessão',
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
    maxAdvanceDays:      +(page?.maxAdvanceDays ?? 30),
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
      title:               page.title ?? 'Agende sua sessão',
      description:         page.description ?? '',
      sessionPrice:        +(page.sessionPrice ?? 150),
      sessionDuration:     +(page.sessionDuration ?? 50),
      presencialSessionDuration: +(page.presencialSessionDuration ?? page.sessionDuration ?? 50),
      onlineSessionDuration:     +(page.onlineSessionDuration ?? page.sessionDuration ?? 50),
      slotInterval:        +(page.slotInterval ?? 50),
      presencialSlotInterval: initialBreakInterval(page, 'presencial'),
      onlineSlotInterval:     initialBreakInterval(page, 'online'),
      minAdvanceDays:      +(page.minAdvanceDays ?? 0),
      maxAdvanceDays:      +(page.maxAdvanceDays ?? 30),
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
        const slot = savedSlots.find(s => s.weekday === d && (s.modality ?? 'online') === key)
        next[key][d] = slot
          ? { enabled: true, startTime: slot.startTime.slice(0, 5), endTime: slot.endTime.slice(0, 5) }
          : { enabled: false, startTime: '09:00', endTime: '18:00' }
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
  function setTime(d: number, field: 'startTime' | 'endTime', val: string) {
    setSchedules(s => ({
      ...s,
      [scheduleTab]: {
        ...s[scheduleTab],
        [d]: { ...s[scheduleTab][d], [field]: val },
      },
    }))
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
    if (form.maxAdvanceDays < 1 || form.maxAdvanceDays > 180) {
      toast.error('A antecedência máxima precisa ficar entre 1 e 180 dias.')
      return false
    }
    if (form.maxAdvanceDays < form.minAdvanceDays) {
      toast.error('A antecedência máxima precisa ser maior que a mínima.')
      return false
    }

    const invalidSlot = MODALITIES.flatMap(({ key }) =>
      WEEKDAYS
        .filter(({ d }) => schedules[key][d]?.enabled)
        .map(({ d, label }) => ({ modality: key, label, slot: schedules[key][d] })),
    ).find(({ modality, slot }) => {
      const start = minutes(slot.startTime)
      const end = minutes(slot.endTime)
      const duration = modality === 'presencial' ? form.presencialSessionDuration : form.onlineSessionDuration
      return start >= end || end - start < duration
    })

    if (invalidSlot) {
      toast.error(`Revise ${invalidSlot.label} em ${invalidSlot.modality}: horário insuficiente para a duração da sessão.`)
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
        sessionDuration: form.onlineSessionDuration,
        slotInterval: form.onlineSessionDuration + form.onlineSlotInterval,
      })
      // Salva horários de disponibilidade
      const slots = MODALITIES.flatMap(({ key }) =>
        WEEKDAYS
          .filter(({ d }) => schedules[key][d]?.enabled)
          .map(({ d }) => ({
            weekday: d,
            modality: key,
            startTime: schedules[key][d].startTime,
            endTime: schedules[key][d].endTime,
          })),
      )
      await saveAvailability.mutateAsync(slots)
      toast.success('Configuracoes salvas')
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
      await addBlockedDate.mutateAsync({
        date: blockedForm.date,
        reason: blockedForm.reason.trim() || undefined,
      })
      setBlockedForm({ date: '', reason: '' })
      toast.success('Data bloqueada.')
    } catch {
      toast.error('Erro ao bloquear data.')
    }
  }

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const isSaving = saveBookingPage.isPending || saveAvailability.isPending

  const currentSchedule = schedules[scheduleTab]
  const enabledCount = WEEKDAYS.filter(({ d }) => currentSchedule[d]?.enabled).length
  const normalizedSlug = normalizeSlug(form.slug || page?.slug || '')
  const publicUrl = normalizedSlug ? `${window.location.origin}/agendar/${normalizedSlug}` : ''

  return (
    <div className="space-y-5">
      <div className="card space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="section-title mb-1">Status do link público</h2>
            <p className="text-sm text-neutral-500">
              {form.isActive
                ? 'Pacientes conseguem acessar e solicitar horários pelo seu link.'
                : 'O link fica pausado e pacientes não conseguem agendar.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => set('isActive', !form.isActive)}
            className={cn(
              'h-10 rounded-xl px-4 text-sm font-semibold transition-colors',
              form.isActive
                ? 'bg-sage-600 text-white hover:bg-sage-700'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
            )}
          >
            {form.isActive ? 'Link ativo' : 'Link pausado'}
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label className="label">URL pública</label>
            <div className="flex overflow-hidden rounded-xl border border-neutral-200 bg-white focus-within:border-sage-300">
              <span className="hidden items-center border-r border-neutral-100 bg-neutral-50 px-3 text-sm text-neutral-400 sm:flex">
                usecognia.com.br/agendar/
              </span>
              <input
                value={form.slug}
                onChange={e => set('slug', normalizeSlug(e.target.value))}
                className="min-w-0 flex-1 px-3 py-2.5 text-sm outline-none"
                placeholder="nicolle-paes"
              />
            </div>
            <p className="mt-1 text-xs text-neutral-400">Use letras, números e hífens. Ex: nicolle-paes.</p>
          </div>
          <a
            href={publicUrl || undefined}
            target="_blank"
            rel="noreferrer"
            className={cn('btn-secondary flex items-center justify-center gap-2 text-sm', !publicUrl && 'pointer-events-none opacity-50')}
          >
            <ExternalLink className="h-4 w-4" />
            Visualizar como paciente
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
                'flex items-center gap-3 p-3 rounded-xl border transition-all',
                slot.enabled
                  ? 'border-sage-200 dark:border-sage-400/40 bg-sage-50 dark:bg-sage-500/15'
                  : 'border-neutral-100 dark:border-white/10 bg-neutral-50 dark:bg-black/15'
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
          <input maxLength={90} value={form.title} onChange={e => set('title', e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="label">Mensagem de boas-vindas</label>
          <textarea maxLength={600} value={form.description} onChange={e => set('description', e.target.value)} rows={3} className="input-field resize-none" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Valor da sessão (R$)</label>
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
          <div>
            <label className="label">Agendar ate quantos dias a frente</label>
            <input type="number" min={1} max={180} value={form.maxAdvanceDays} onChange={e => set('maxAdvanceDays', +e.target.value)} className="input-field" />
            <p className="text-xs text-neutral-400 mt-1">Ex: 15 impede que alguem marque para daqui dois meses.</p>
          </div>
        </div>
      </div>

      {/* ── Pagamento ───────────────────────────────── */}
      <div className="card space-y-4">
        <h2 className="section-title">Modalidades</h2>
        <div>
          <label className="label">Modalidades aceitas no link publico</label>
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
        <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr_auto] gap-3">
          <input
            type="date"
            value={blockedForm.date}
            onChange={e => setBlockedForm(f => ({ ...f, date: e.target.value }))}
            className="input-field"
          />
          <input
            value={blockedForm.reason}
            onChange={e => setBlockedForm(f => ({ ...f, reason: e.target.value }))}
            className="input-field"
            placeholder="Motivo opcional"
          />
          <button type="button" onClick={blockDate} className="btn-secondary text-sm">
            Bloquear
          </button>
        </div>
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
