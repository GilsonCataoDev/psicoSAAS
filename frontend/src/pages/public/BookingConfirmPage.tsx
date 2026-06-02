import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AlertCircle, CalendarPlus, Check, Download, ExternalLink, Loader2, X } from 'lucide-react'
import BrandLogo from '@/components/ui/BrandLogo'
import { api } from '@/lib/api'
import { createGoogleCalendarUrl, createIcsContent, type CalendarEvent } from '@/lib/calendar'

type ConfirmAction = 'confirmar' | 'cancelar'

type CalendarBooking = {
  id: string
  patientName?: string
  psychologistName?: string
  psychologistCrp?: string
  date: string
  time: string
  duration: number
  modality: 'presencial' | 'online'
}

type BookingActionResponse = {
  message: string
  booking?: CalendarBooking
}

function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    if (response?.data?.message) return response.data.message
  }
  return 'Não foi possível processar este link. Tente novamente.'
}

function downloadIcs(event: CalendarEvent): void {
  const blob = new Blob([createIcsContent(event)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'usecognia-sessao.ics'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function BookingConfirmPage() {
  const { token, action } = useParams<{ token: string; action: ConfirmAction }>()
  const isConfirm = action === 'confirmar'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [result, setResult] = useState<BookingActionResponse | null>(null)

  useEffect(() => {
    let mounted = true

    async function submitAction() {
      if (!token || !action) {
        setError('Link invalido.')
        setLoading(false)
        return
      }

      try {
        const endpoint = isConfirm
          ? `/public/booking/confirm/${token}`
          : `/public/booking/cancel/${token}`
        const { data } = await api.get<BookingActionResponse>(endpoint)
        if (mounted) setResult(data)
      } catch (err) {
        if (mounted) setError(getErrorMessage(err))
      } finally {
        if (mounted) setLoading(false)
      }
    }

    submitAction()

    return () => {
      mounted = false
    }
  }, [action, isConfirm, token])

  const calendarEvent = useMemo<CalendarEvent | null>(() => {
    if (!isConfirm || !result?.booking) return null

    const booking = result.booking
    const professional = booking.psychologistName ?? 'UseCognia'
    const crp = booking.psychologistCrp ? ` - CRP ${booking.psychologistCrp}` : ''
    const modality = booking.modality === 'online' ? 'Online' : 'Presencial'

    return {
      title: `Sessão com ${professional}`,
      startDate: booking.date,
      startTime: booking.time,
      durationMinutes: booking.duration || 50,
      location: modality,
      details: `Sessão confirmada pela UseCognia.\nProfissional: ${professional}${crp}\nModalidade: ${modality}`,
    }
  }, [isConfirm, result])

  const googleCalendarUrl = calendarEvent ? createGoogleCalendarUrl(calendarEvent) : ''
  const iconState = error ? 'error' : isConfirm ? 'confirm' : 'cancel'

  return (
    <div className="min-h-screen cognia-surface flex flex-col items-center justify-center p-6">
      <div className="mb-8">
        <BrandLogo compact className="w-12 h-12" />
      </div>

      <div className="bg-white dark:bg-[#17182d] rounded-3xl shadow-lifted p-8 sm:p-10 max-w-md w-full text-center animate-slide-up border border-white/80 dark:border-white/10">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${
          iconState === 'error'
            ? 'bg-rose-50 dark:bg-rose-500/15'
            : iconState === 'confirm'
              ? 'bg-sage-100'
              : 'bg-mist-100 dark:bg-white/10'
        }`}>
          {loading && <Loader2 className="w-8 h-8 text-sage-600 animate-spin" />}
          {!loading && error && <AlertCircle className="w-8 h-8 text-rose-500" />}
          {!loading && !error && isConfirm && <Check className="w-8 h-8 text-sage-600" />}
          {!loading && !error && !isConfirm && <X className="w-8 h-8 text-mist-600 dark:text-neutral-300" />}
        </div>

        <h1 className="font-display text-2xl font-semibold text-neutral-800 dark:text-neutral-100 mb-2">
          {loading
            ? 'Processando agendamento'
            : error
              ? 'Link não processado'
              : isConfirm
                ? 'Sessão confirmada'
                : 'Sessão cancelada'}
        </h1>

        <p className="text-neutral-500 dark:text-neutral-300 leading-relaxed">
          {loading
            ? 'Estamos validando seu link com seguranca.'
            : error
              ? error
              : result?.message ?? (
                  isConfirm
                    ? 'Sua sessão está confirmada. Você receberá um lembrete antes do encontro.'
                    : 'Sua sessão foi cancelada. Quando quiser remarcar, use o link de agendamento novamente.'
                )}
        </p>

        {calendarEvent && (
          <div className="mt-7 space-y-3">
            <a
              href={googleCalendarUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-primary w-full inline-flex items-center justify-center gap-2"
            >
              <CalendarPlus className="w-4 h-4" />
              Google Agenda
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>
            <button
              type="button"
              onClick={() => downloadIcs(calendarEvent)}
              className="btn-secondary w-full inline-flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Calendario do celular
            </button>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              No iPhone, abra o arquivo baixado para adicionar ao Calendario do iOS.
            </p>
          </div>
        )}
      </div>

      <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-8">UseCognia - Agendamento seguro</p>
    </div>
  )
}
