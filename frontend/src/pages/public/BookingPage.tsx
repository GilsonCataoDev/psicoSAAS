import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ChevronLeft, ChevronRight, Check,
  MapPin, Video, Clock, DollarSign, ShieldCheck, ExternalLink,
  Calendar,
} from 'lucide-react'
import {
  format, addDays, startOfMonth, endOfMonth,
  eachDayOfInterval, getDay, isBefore, isToday,
  startOfDay, parseISO, addMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn, formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import { track, EVENTS } from '@/lib/analytics'
import { usePublicBookingPage, usePublicBookingSlots, useCreateBooking, usePublicBookingDates } from '@/hooks/useApi'

// WhatsApp SVG icon
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.118 1.532 5.845L.057 23.486a.5.5 0 0 0 .612.612l5.694-1.47A11.932 11.932 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.9a9.884 9.884 0 0 1-5.031-1.373l-.361-.214-3.735.964.991-3.641-.235-.374A9.867 9.867 0 0 1 2.1 12C2.1 6.534 6.534 2.1 12 2.1c5.466 0 9.9 4.434 9.9 9.9 0 5.466-4.434 9.9-9.9 9.9z" />
    </svg>
  )
}

const schema = z.object({
  patientName:     z.string().min(2, 'Nome obrigatório'),
  patientEmail:    z.string().trim().optional().or(z.literal('')),
  patientPhone:    z.string().trim().optional().or(z.literal('')),
  modality:        z.enum(['presencial', 'online']),
  patientNotes:    z.string().optional(),
  privacyAccepted: z.boolean().refine(Boolean, 'Voce precisa autorizar o uso dos dados para agendamento.'),
}).superRefine((data, ctx) => {
  const hasEmail = !!data.patientEmail?.trim()
  const phoneDigits = data.patientPhone?.replace(/\D/g, '') ?? ''
  if (!hasEmail && !phoneDigits) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['patientEmail'],
      message: 'Informe e-mail ou WhatsApp.',
    })
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['patientPhone'],
      message: 'Informe e-mail ou WhatsApp.',
    })
  }
  if (hasEmail && !z.string().email().safeParse(data.patientEmail).success) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['patientEmail'],
      message: 'E-mail inválido.',
    })
  }
  if (phoneDigits && phoneDigits.length < 10) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['patientPhone'],
      message: 'WhatsApp inválido.',
    })
  }
})
type FormData = z.infer<typeof schema>

type Step = 'landing' | 'date' | 'time' | 'form' | 'success'

type SavedPatientContact = Pick<FormData, 'patientName' | 'patientEmail' | 'patientPhone'>

function contactStorageKey(slug?: string) {
  return `usecognia:booking-contact:${slug || 'default'}`
}

function loadSavedPatientContact(slug?: string): Partial<SavedPatientContact> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(contactStorageKey(slug))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SavedPatientContact>
    return {
      patientName: typeof parsed.patientName === 'string' ? parsed.patientName : undefined,
      patientEmail: typeof parsed.patientEmail === 'string' ? parsed.patientEmail : undefined,
      patientPhone: typeof parsed.patientPhone === 'string' ? parsed.patientPhone : undefined,
    }
  } catch {
    return null
  }
}

function savePatientContact(slug: string | undefined, data: SavedPatientContact) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(contactStorageKey(slug), JSON.stringify(data))
  } catch {
    // localStorage pode estar indisponivel em modo privado; o agendamento deve continuar.
  }
}

function formatWhatsApp(raw?: string | null) {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null
  // já tem DDI
  if (digits.startsWith('55') && digits.length >= 12) return digits
  // acrescenta DDI Brasil
  return `55${digits}`
}

function getMaxAdvanceDate(today: Date, maxAdvanceDays: number): Date {
  if (maxAdvanceDays > 0 && maxAdvanceDays % 30 === 0) {
    return endOfMonth(addMonths(startOfMonth(today), maxAdvanceDays / 30))
  }
  return addDays(today, maxAdvanceDays)
}

export default function BookingPage() {
  const { slug } = useParams()
  const { data: page, isLoading: pageLoading, isError } = usePublicBookingPage(slug ?? '')

  const [step, setStep] = useState<Step>('landing')
  const [month, setMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      modality: 'presencial',
      privacyAccepted: false,
      ...loadSavedPatientContact(slug),
    },
  })
  const selectedModality = watch('modality')
  const monthKey = format(month, 'yyyy-MM')
  const { data: availableDates = [], isFetching: datesLoading } = usePublicBookingDates(
    slug ?? '',
    monthKey,
    selectedModality,
    step !== 'landing',
  )
  const { data: slots = [], isFetching: slotsLoading } = usePublicBookingSlots(slug ?? '', selectedDate, selectedModality)
  const createBooking = useCreateBooking(slug ?? '')
  const availableDateSet = new Set(availableDates)
  const availableDatesInMonth = availableDates
    .map(date => parseISO(date))
    .filter(date => format(date, 'yyyy-MM') === monthKey)
    .sort((a, b) => a.getTime() - b.getTime())

  useEffect(() => { track(EVENTS.BOOKING_PAGE_VIEWED) }, [])

  // SEO dinâmico — atualiza title e meta description com dados do psicólogo
  useEffect(() => {
    if (!page) return
    const name = page.psychologistName
    const specialty = (page as any).specialty ?? 'Psicólogo(a)'
    const city = (page as any).city ?? ''
    document.title = `Agendar consulta com ${name} — ${specialty}${city ? ` em ${city}` : ''} | UseCognia`
    const meta = document.querySelector('meta[name="description"]')
    if (meta) meta.setAttribute('content',
      `Agende sua sessão com ${name}, ${specialty.toLowerCase()}${city ? ` em ${city}` : ''}. Agendamento online rápido e seguro via UseCognia.`
    )
    return () => {
      document.title = 'UseCognia | Agenda, prontuário e documentos para psicólogos e terapeutas'
      meta?.setAttribute('content', 'Plataforma de gestão para psicólogos e terapeutas autônomos.')
    }
  }, [page])

  useEffect(() => {
    if (!page) return
    if (page.allowOnline && !page.allowPresencial) setValue('modality', 'online')
    if (page.allowPresencial && !page.allowOnline) setValue('modality', 'presencial')
  }, [page, setValue])

  useEffect(() => {
    const saved = loadSavedPatientContact(slug)
    if (!saved) return
    if (saved.patientName) setValue('patientName', saved.patientName)
    if (saved.patientEmail) setValue('patientEmail', saved.patientEmail)
    if (saved.patientPhone) setValue('patientPhone', saved.patientPhone)
  }, [slug, setValue])

  function startBooking() {
    setStep('date')
  }

  function chooseModality(modality: 'presencial' | 'online') {
    setValue('modality', modality)
    setSelectedDate(null)
    setSelectedTime(null)
    setStep('date')
  }

  // ─── Calendário ─────────────────────────────────────────────────────────────
  const monthDays = eachDayOfInterval({
    start: startOfMonth(month),
    end: endOfMonth(month),
  })
  const startPad = getDay(startOfMonth(month))

  function selectDate(date: Date) {
    const str = format(date, 'yyyy-MM-dd')
    setSelectedDate(str)
    setStep('time')
  }

  function isDisabled(date: Date) {
    const today = startOfDay(new Date())
    const min = addDays(today, page?.minAdvanceDays ?? 0)
    const max = getMaxAdvanceDate(today, page?.maxAdvanceDays ?? 60)
    const dateStr = format(date, 'yyyy-MM-dd')
    return isBefore(date, min) || isBefore(max, date) || !availableDateSet.has(dateStr)
  }

  // ─── Envio ───────────────────────────────────────────────────────────────────
  async function onSubmit(data: FormData) {
    if (!selectedDate || !selectedTime) {
      toast.error('Escolha uma data e um horario.')
      return
    }
    try {
      const { privacyAccepted: _privacyAccepted, ...bookingData } = data
      await createBooking.mutateAsync({
        ...bookingData,
        patientEmail: bookingData.patientEmail?.trim() || undefined,
        patientPhone: bookingData.patientPhone?.replace(/\D/g, '') || undefined,
        date: selectedDate,
        time: selectedTime,
      })
      savePatientContact(slug, {
        patientName: bookingData.patientName.trim(),
        patientEmail: bookingData.patientEmail?.trim() ?? '',
        patientPhone: bookingData.patientPhone?.replace(/\D/g, '') ?? '',
      })
      track(EVENTS.BOOKING_CONFIRMED)
      setStep('success')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Erro ao confirmar agendamento. Tente novamente.')
    }
  }

  // ─── Loading / Error ─────────────────────────────────────────────────────────
  if (pageLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-sage-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (isError || !page) return (
    <div className="min-h-screen flex items-center justify-center text-center px-4">
      <div>
        <p className="font-medium text-neutral-700">Página de agendamento não encontrada.</p>
        <p className="text-sm text-neutral-400 mt-1">Verifique o link com o seu psicólogo.</p>
      </div>
    </div>
  )

  const waNumber = formatWhatsApp((page as any).psychologistPhone)
  const selectedDuration = selectedModality === 'presencial'
    ? (page.presencialSessionDuration ?? page.sessionDuration)
    : (page.onlineSessionDuration ?? page.sessionDuration)
  const initials = page.psychologistName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('')

  // ── LANDING ──────────────────────────────────────────────────────────────────
  if (step === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sage-50 via-white to-mist-50 dark:from-[#0d1713] dark:via-[#101d18] dark:to-[#12231d] flex flex-col items-center justify-center px-6 py-12 relative">
        <div className="w-full max-w-md flex flex-col items-center bg-white/90 dark:bg-[#17251f]/90 backdrop-blur-xl rounded-3xl border border-white dark:border-sage-200/15 shadow-lifted px-7 py-9 sm:px-10 sm:py-11">

          {/* Avatar */}
          <div className="w-28 h-28 rounded-full overflow-hidden bg-neutral-100 dark:bg-sage-500/15 mb-6 ring-4 ring-white dark:ring-sage-300/20 shadow-md shrink-0">
            {page.avatarUrl ? (
              <img src={page.avatarUrl} alt={page.psychologistName} className="w-full h-full object-cover object-center" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-sage-100 text-2xl font-semibold text-sage-700 dark:bg-sage-500/20 dark:text-sage-100">
                {initials || 'UC'}
              </div>
            )}
          </div>

          {/* Nome */}
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-800 dark:text-neutral-100 text-center leading-tight mb-2">
            {page.psychologistName}
          </h1>

          {/* Especialidade / título */}
          {((page as any).specialty || page.title) && (
            <p className="text-sm text-neutral-500 dark:text-neutral-300 text-center mb-2">
              {(page as any).specialty ?? page.title}
            </p>
          )}
          {page.psychologistCrp && (
            <p className="text-xs text-neutral-400 dark:text-neutral-400 text-center mb-8">
              CRP {page.psychologistCrp}
            </p>
          )}

          {/* Botões */}
          <div className="w-full space-y-3">
            <button
              onClick={startBooking}
              className="w-full flex items-center justify-center gap-2 bg-sage-500 hover:bg-sage-600 text-white rounded-xl py-3.5 text-sm font-semibold shadow-sm hover:shadow-md transition-all"
            >
              <Calendar className="w-4 h-4" />
              Agende agora
            </button>

            {waNumber && (
              <a
                href={`https://wa.me/${waNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 border border-neutral-200 dark:border-white/15 bg-white/70 dark:bg-white/5 rounded-xl py-3.5 text-sm font-medium text-neutral-700 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-white/10 transition-colors"
              >
                <WhatsAppIcon className="w-4 h-4 text-[#25d366]" />
                Whatsapp
              </a>
            )}
          </div>
        </div>

        {/* Powered by */}
        <p className="absolute bottom-6 text-xs text-neutral-400 dark:text-neutral-500">
          Powered by{' '}
          <span className="font-semibold text-sage-600 dark:text-sage-300">UseCognia</span>
        </p>
      </div>
    )
  }

  // ─── Layout com sidebar/header para as demais etapas ────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-sage-50 via-white to-mist-50 dark:from-[#0d1713] dark:via-[#101d18] dark:to-[#12231d] flex flex-col">
      {/* Header */}
      <header className="bg-white/80 dark:bg-[#17251f]/85 backdrop-blur-sm border-b border-neutral-100 dark:border-white/10 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => setStep('landing')}
            className="w-10 h-10 bg-sage-50 border border-sage-100 rounded-xl overflow-hidden flex items-center justify-center shrink-0 hover:bg-sage-100 transition-colors"
          >
            {page.avatarUrl ? (
              <img src={page.avatarUrl} alt={page.psychologistName} className="w-full h-full object-cover object-center" />
            ) : (
              <span className="text-xs font-semibold text-sage-700 dark:text-sage-100">{initials || 'UC'}</span>
            )}
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-neutral-800 dark:text-neutral-100 text-sm leading-none">{page.psychologistName}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <p className="text-xs text-neutral-400">CRP {page.psychologistCrp}</p>
              <button
                type="button"
                onClick={() => window.open('https://cadastro.cfp.org.br/', '_blank', 'noopener,noreferrer')}
                className="flex items-center gap-0.5 text-xs text-sage-600 hover:text-sage-700 hover:underline transition-colors"
              >
                <ShieldCheck className="w-3 h-3" />
                Verificar registro
                <ExternalLink className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">

        {/* ── Sucesso ─────────────────────────────────────────────────── */}
        {step === 'success' && (
          <div className="animate-slide-up text-center py-8 sm:py-12">
            <div className="w-20 h-20 bg-sage-100 dark:bg-sage-500/15 ring-8 ring-sage-50 dark:ring-sage-500/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-sage-600 dark:text-sage-300" />
            </div>
            <h2 className="font-display text-2xl font-semibold text-neutral-800 dark:text-neutral-100 mb-2">Agendamento confirmado!</h2>
            <p className="text-neutral-500 dark:text-neutral-300 mb-6 max-w-sm mx-auto">
              {page.confirmationMessage ?? 'Seu horário foi reservado com sucesso. Você receberá os detalhes da sessão em breve.'}
            </p>
            <div className="bg-white dark:bg-[#17251f] border border-neutral-100 dark:border-sage-200/15 rounded-2xl shadow-card p-5 text-left max-w-sm mx-auto">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-400 mb-4">Resumo da sessão</p>
              <div className="space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
                <p className="flex items-center justify-between gap-4">
                  <span className="text-neutral-400 dark:text-neutral-400">Data</span>
                  <strong className="font-medium">{selectedDate && format(parseISO(selectedDate), "dd 'de' MMMM", { locale: ptBR })}</strong>
                </p>
                <p className="flex items-center justify-between gap-4">
                  <span className="text-neutral-400 dark:text-neutral-400">Horário</span>
                  <strong className="font-medium">{selectedTime}</strong>
                </p>
                <p className="flex items-center justify-between gap-4">
                  <span className="text-neutral-400 dark:text-neutral-400">Duração</span>
                  <strong className="font-medium">{selectedDuration} minutos</strong>
                </p>
                <p className="flex items-center justify-between gap-4 border-t border-neutral-100 dark:border-white/10 pt-3">
                  <span className="text-neutral-400 dark:text-neutral-400">Valor</span>
                  <strong className="font-semibold text-sage-700 dark:text-sage-300">{formatCurrency(page.sessionPrice)}</strong>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => window.open('https://cadastro.cfp.org.br/', '_blank', 'noopener,noreferrer')}
              className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 bg-sage-50 dark:bg-sage-500/15 hover:bg-sage-100 dark:hover:bg-sage-500/25 border border-sage-200 dark:border-sage-400/30 rounded-full text-xs font-medium text-sage-700 dark:text-sage-200 transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-sage-500" />
              Verificar registro do psicólogo no CFP
              <ExternalLink className="w-3 h-3 text-sage-400" />
            </button>
          </div>
        )}

        {/* ── Etapas de agendamento ──────────────────────────────────── */}
        {step !== 'success' && (
          <>
            {/* Intro */}
            <div className="mb-8">
              <h1 className="font-display text-2xl font-light text-neutral-800 mb-2">
                {page.title ?? 'Agende sua sessão'}
              </h1>
              {page.description && (
                <p className="text-neutral-500 leading-relaxed">{page.description}</p>
              )}
              <div className="flex flex-wrap gap-3 mt-4 text-sm text-neutral-500">
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-sage-500" />{selectedDuration} min</span>
                <span className="flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-sage-500" />{formatCurrency(page.sessionPrice)}</span>
                {page.allowPresencial && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-sage-500" />Presencial</span>}
                {page.allowOnline && <span className="flex items-center gap-1.5"><Video className="w-4 h-4 text-mist-500" />Online</span>}
              </div>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-2 mb-8">
              {(['date', 'time', 'form'] as Step[]).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
                    step === s ? 'bg-sage-500 text-white' :
                    ['date','time','form'].indexOf(step) > i ? 'bg-sage-100 text-sage-700' :
                    'bg-neutral-100 text-neutral-400'
                  )}>
                    {['date','time','form'].indexOf(step) > i ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span className={cn('text-sm hidden sm:block', step === s ? 'text-neutral-700 font-medium' : 'text-neutral-400')}>
                    {['Escolher data', 'Escolher horário', 'Seus dados'][i]}
                  </span>
                  {i < 2 && <div className="w-8 h-px bg-neutral-200" />}
                </div>
              ))}
            </div>

            {/* ── Step 1: Calendário ─────────────────────────────────── */}
            {step === 'date' && (
              <div className="bg-white rounded-3xl shadow-card p-6 animate-slide-up">
                {page.allowPresencial && page.allowOnline && (
                  <div className="mb-6">
                    <h2 className="font-medium text-neutral-800 mb-3">Escolha o tipo de atendimento</h2>
                    <div className="grid grid-cols-2 gap-2">
                      {(['presencial','online'] as const).map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => chooseModality(m)}
                          className={cn(
                            'flex items-center gap-2 p-3 border rounded-xl transition-all text-left',
                            selectedModality === m ? 'border-sage-400 bg-sage-50 text-sage-700' : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50',
                          )}
                        >
                          {m === 'presencial' ? <MapPin className="w-4 h-4 text-sage-500" /> : <Video className="w-4 h-4 text-mist-500" />}
                          <span className="text-sm font-medium capitalize">{m}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-medium text-neutral-800 capitalize">
                    {format(month, 'MMMM yyyy', { locale: ptBR })}
                  </h2>
                  <div className="flex gap-1">
                    <button onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() - 1))}
                      className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-500 transition-colors">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() + 1))}
                      className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-500 transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {datesLoading && (
                  <div className="mb-3 flex items-center gap-2 text-xs text-neutral-400">
                    <span className="w-3 h-3 border-2 border-sage-300 border-t-transparent rounded-full animate-spin" />
                    Buscando datas disponiveis...
                  </div>
                )}
                {!datesLoading && (
                  <div className="mb-4 rounded-2xl border border-sage-100 bg-sage-50 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-sage-800">
                        {availableDatesInMonth.length > 0
                          ? `${availableDatesInMonth.length} ${availableDatesInMonth.length === 1 ? 'data disponivel' : 'datas disponiveis'} neste mes`
                          : 'Nenhuma data disponivel neste mes'}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-sage-700">
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-sage-500" />
                          Disponivel
                        </span>
                        <span className="inline-flex items-center gap-1 text-neutral-400">
                          <span className="h-2 w-2 rounded-full bg-neutral-200" />
                          Indisponivel
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-7 mb-2">
                  {['D','S','T','Q','Q','S','S'].map((d, i) => (
                    <div key={i} className="text-center text-xs text-neutral-400 py-1">{d}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
                  {monthDays.map(day => {
                    const disabled = isDisabled(day)
                    const today = isToday(day)
                    const dateStr = format(day, 'yyyy-MM-dd')
                    const available = availableDateSet.has(dateStr)
                    const selected = selectedDate === dateStr
                    return (
                      <button key={dateStr} disabled={disabled}
                        onClick={() => selectDate(day)}
                        className={cn(
                          'relative aspect-square rounded-xl text-sm font-medium transition-all',
                          disabled ? 'text-neutral-200 cursor-not-allowed' :
                          selected ? 'bg-sage-500 text-white shadow-sm' :
                          available ? 'bg-sage-50 text-sage-800 ring-1 ring-sage-200 hover:bg-sage-100 hover:ring-sage-300' :
                          today ? 'bg-neutral-50 text-neutral-500 hover:bg-neutral-100' :
                          'text-neutral-700 hover:bg-neutral-50'
                        )}>
                        {format(day, 'd')}
                        {available && !disabled && (
                          <span className={cn(
                            'absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full',
                            selected ? 'bg-white' : 'bg-sage-500',
                          )} />
                        )}
                      </button>
                    )
                  })}
                </div>

                {!datesLoading && availableDatesInMonth.length > 0 && (
                  <div className="mt-6 border-t border-neutral-100 pt-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                      Proximas datas disponiveis
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {availableDatesInMonth.slice(0, 8).map(date => {
                        const dateStr = format(date, 'yyyy-MM-dd')
                        const selected = selectedDate === dateStr
                        return (
                          <button
                            key={dateStr}
                            type="button"
                            onClick={() => selectDate(date)}
                            className={cn(
                              'flex-none rounded-xl border px-3 py-2 text-left text-sm transition-colors',
                              selected
                                ? 'border-sage-500 bg-sage-500 text-white'
                                : 'border-sage-200 bg-white text-sage-800 hover:bg-sage-50',
                            )}
                          >
                            <span className="block text-xs opacity-75">{format(date, 'EEE', { locale: ptBR })}</span>
                            <span className="font-semibold">{format(date, 'dd/MM')}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 2: Horários ───────────────────────────────────── */}
            {step === 'time' && (
              <div className="bg-white rounded-3xl shadow-card p-6 animate-slide-up">
                <button onClick={() => setStep('date')}
                  className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-5 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                  {selectedDate && format(parseISO(selectedDate), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </button>

                <h2 className="font-medium text-neutral-800 mb-5">Escolha um horário</h2>

                {slotsLoading ? (
                  <div className="flex justify-center py-6">
                    <div className="w-6 h-6 border-2 border-sage-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-neutral-400 text-sm text-center py-6">Sem horários disponíveis neste dia.</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {slots.map(slot => (
                      <button key={slot} onClick={() => { setSelectedTime(slot); track(EVENTS.SLOT_BOOKED); setStep('form') }}
                        className={cn(
                          'py-3 rounded-xl text-sm font-medium border transition-all',
                          selectedTime === slot
                            ? 'bg-sage-500 text-white border-sage-500'
                            : 'border-neutral-200 text-neutral-700 hover:border-sage-300 hover:bg-sage-50'
                        )}>
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Step 3: Formulário ─────────────────────────────────── */}
            {step === 'form' && (
              <div className="bg-white rounded-3xl shadow-card p-6 animate-slide-up">
                <button onClick={() => setStep('time')}
                  className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-5 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                  {selectedDate && format(parseISO(selectedDate), "dd/MM", { locale: ptBR })} às {selectedTime}
                </button>

                <h2 className="font-medium text-neutral-800 mb-5">Seus dados</h2>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="label">Nome completo *</label>
                    <input {...register('patientName')} className="input-field" placeholder="Como você se chama?" />
                    {errors.patientName && <p className="text-rose-500 text-xs mt-1">{errors.patientName.message}</p>}
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Informe pelo menos uma forma de contato: e-mail ou WhatsApp.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label">E-mail</label>
                      <input {...register('patientEmail')} type="email" className="input-field" placeholder="voce@email.com" />
                      {errors.patientEmail && <p className="text-rose-500 text-xs mt-1">{errors.patientEmail.message}</p>}
                    </div>
                    <div>
                      <label className="label">WhatsApp</label>
                      <input {...register('patientPhone')} className="input-field" placeholder="(11) 99999-9999" />
                      {errors.patientPhone && <p className="text-rose-500 text-xs mt-1">{errors.patientPhone.message}</p>}
                    </div>
                  </div>

                  <input {...register('modality')} type="hidden" value={selectedModality} />
                  <div>
                    <label className="label">Modalidade</label>
                    <div className="flex items-center justify-between gap-2 p-3 border border-sage-200 bg-sage-50 rounded-xl text-sm font-medium text-sage-700">
                      <span className="flex items-center gap-2">
                        {selectedModality === 'presencial'
                          ? <MapPin className="w-4 h-4 text-sage-500" />
                          : <Video className="w-4 h-4 text-mist-500" />}
                        {selectedModality === 'presencial' ? 'Presencial' : 'Online'}
                      </span>
                      {page.allowPresencial && page.allowOnline && (
                        <button type="button" onClick={() => setStep('date')} className="text-xs text-sage-600 hover:underline">
                          Trocar
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="label">Alguma observação? (opcional)</label>
                    <textarea {...register('patientNotes')} rows={2} className="input-field resize-none"
                      placeholder="Conte um pouco sobre o que te traz aqui, se quiser..." />
                  </div>

                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                    <label className="flex items-start gap-3 text-sm text-neutral-600">
                      <input
                        type="checkbox"
                        {...register('privacyAccepted')}
                        className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-sage-600 focus:ring-sage-500"
                      />
                      <span>
                        Autorizo o uso dos dados informados para agendamento e comunicação sobre esta sessão.
                      </span>
                    </label>
                    {errors.privacyAccepted && (
                      <p className="mt-2 text-xs text-rose-500">{errors.privacyAccepted.message}</p>
                    )}
                  </div>

                  <div className="bg-sage-50 rounded-2xl p-4 text-sm text-sage-700 space-y-1">
                    <p className="font-medium">Resumo da sessão</p>
                    <p>{selectedDate && format(parseISO(selectedDate), "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
                    <p>{selectedTime} · {selectedDuration} minutos</p>
                    <p>{formatCurrency(page.sessionPrice)}</p>
                  </div>

                  <button type="submit" disabled={isSubmitting || createBooking.isPending}
                    className="btn-primary w-full flex items-center justify-center gap-2">
                    {isSubmitting || createBooking.isPending
                      ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Enviando...</>
                      : 'Confirmar agendamento'
                    }
                  </button>

                  <p className="text-xs text-neutral-400 text-center">
                    Ao agendar, voce concorda com o uso dos seus dados para agendamento e comunicacao sobre a sessao.
                  </p>
                </form>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="text-center py-6 text-xs text-neutral-400">
        UseCognia · Agendamento seguro e respeitoso
      </footer>
    </div>
  )
}
