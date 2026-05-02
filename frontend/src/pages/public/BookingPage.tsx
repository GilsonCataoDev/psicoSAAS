import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ChevronLeft, ChevronRight, Check,
  MapPin, Video, Heart, Clock, DollarSign, ShieldCheck, ExternalLink,
} from 'lucide-react'
import {
  format, addDays, startOfMonth, endOfMonth,
  eachDayOfInterval, getDay, isBefore, isToday,
  startOfDay, parseISO,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn, formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import { usePublicBookingPage, usePublicBookingSlots, useCreateBooking } from '@/hooks/useApi'

const schema = z.object({
  patientName:  z.string().min(2, 'Nome obrigatório'),
  patientEmail: z.string().email('E-mail inválido'),
  patientPhone: z.string().optional(),
  modality:     z.enum(['presencial', 'online']),
  patientNotes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

type Step = 'date' | 'time' | 'form' | 'success'

export default function BookingPage() {
  const { slug } = useParams()
  const { data: page, isLoading: pageLoading, isError } = usePublicBookingPage(slug ?? '')

  const [step, setStep] = useState<Step>('date')
  const [month, setMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { modality: 'presencial' },
  })
  const selectedModality = watch('modality')
  const { data: slots = [], isFetching: slotsLoading } = usePublicBookingSlots(slug ?? '', selectedDate, selectedModality)
  const createBooking = useCreateBooking(slug ?? '')

  useEffect(() => {
    if (!page) return
    if (page.allowOnline && !page.allowPresencial) setValue('modality', 'online')
    if (page.allowPresencial && !page.allowOnline) setValue('modality', 'presencial')
  }, [page, setValue])

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
    const min = addDays(today, page?.minAdvanceDays ?? 1)
    const max = addDays(today, page?.maxAdvanceDays ?? 60)
    return isBefore(date, min) || isBefore(max, date) || getDay(date) === 0 || getDay(date) === 6
  }

  // ─── Envio ───────────────────────────────────────────────────────────────────
  async function onSubmit(data: FormData) {
    try {
      await createBooking.mutateAsync({ ...data, date: selectedDate, time: selectedTime })
      setStep('success')
    } catch {
      toast.error('Erro ao enviar solicitação. Tente novamente.')
    }
  }

  if (pageLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-sage-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (isError || !page) return (
    <div className="min-h-screen flex items-center justify-center text-center px-4">
      <div>
        <p className="text-2xl mb-2">🌿</p>
        <p className="font-medium text-neutral-700">Página de agendamento não encontrada.</p>
        <p className="text-sm text-neutral-400 mt-1">Verifique o link com o seu psicólogo.</p>
      </div>
    </div>
  )

  // ─── Layout externo (sem sidebar) ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-sage-50 via-white to-mist-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-neutral-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-sage-500 rounded-xl flex items-center justify-center shrink-0">
            <Heart className="w-4 h-4 text-white" fill="white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-neutral-800 text-sm leading-none">{page.psychologistName}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <p className="text-xs text-neutral-400">CRP {page.psychologistCrp}</p>
              <button
                type="button"
                onClick={() => window.open('https://cadastro.cfp.org.br/', '_blank', 'noopener,noreferrer')}
                className="flex items-center gap-0.5 text-xs text-sage-600 hover:text-sage-700 hover:underline transition-colors"
                title="Verificar registro ativo no portal oficial do CFP"
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
          <div className="animate-slide-up text-center py-12">
            <div className="w-20 h-20 bg-sage-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-sage-600" />
            </div>
            <h2 className="font-display text-2xl text-neutral-800 mb-2">Solicitação enviada!</h2>
            <p className="text-neutral-500 mb-4 max-w-sm mx-auto">
              {page.confirmationMessage ?? 'Recebemos sua solicitação. Entraremos em contato para confirmar em breve! 💙'}
            </p>
            <div className="bg-white rounded-2xl shadow-card p-5 text-left max-w-xs mx-auto mt-6">
              <p className="text-sm font-medium text-neutral-700 mb-3">Resumo</p>
              <div className="space-y-2 text-sm text-neutral-600">
                <p>📅 {selectedDate && format(parseISO(selectedDate), "dd 'de' MMMM", { locale: ptBR })}</p>
                <p>⏰ {selectedTime}</p>
                <p>⏱ {page.sessionDuration} minutos</p>
                <p>💰 {formatCurrency(page.sessionPrice)}</p>
              </div>
            </div>

            {/* Badge de verificação CFP */}
            <button
              type="button"
              onClick={() => window.open('https://cadastro.cfp.org.br/', '_blank', 'noopener,noreferrer')}
              className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-sage-50 hover:bg-sage-100 border border-sage-200 rounded-full text-xs text-sage-700 transition-colors"
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
              <h1 className="font-display text-3xl font-light text-neutral-800 mb-2">
                {page.title ?? 'Agende sua sessão'}
              </h1>
              {page.description && (
                <p className="text-neutral-500 leading-relaxed">{page.description}</p>
              )}
              <div className="flex flex-wrap gap-3 mt-4 text-sm text-neutral-500">
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-sage-500" />{page.sessionDuration} min</span>
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

                {/* Day headers */}
                <div className="grid grid-cols-7 mb-2">
                  {['D','S','T','Q','Q','S','S'].map((d, i) => (
                    <div key={i} className="text-center text-xs text-neutral-400 py-1">{d}</div>
                  ))}
                </div>

                {/* Days */}
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
                  {monthDays.map(day => {
                    const disabled = isDisabled(day)
                    const today = isToday(day)
                    const dateStr = format(day, 'yyyy-MM-dd')
                    const selected = selectedDate === dateStr
                    return (
                      <button key={dateStr} disabled={disabled}
                        onClick={() => selectDate(day)}
                        className={cn(
                          'aspect-square rounded-xl text-sm font-medium transition-all',
                          disabled ? 'text-neutral-200 cursor-not-allowed' :
                          selected ? 'bg-sage-500 text-white shadow-sm' :
                          today ? 'bg-sage-50 text-sage-700 hover:bg-sage-100' :
                          'text-neutral-700 hover:bg-sage-50'
                        )}>
                        {format(day, 'd')}
                      </button>
                    )
                  })}
                </div>
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
                      <button key={slot} onClick={() => { setSelectedTime(slot); setStep('form') }}
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
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">E-mail *</label>
                      <input {...register('patientEmail')} type="email" className="input-field" />
                      {errors.patientEmail && <p className="text-rose-500 text-xs mt-1">{errors.patientEmail.message}</p>}
                    </div>
                    <div>
                      <label className="label">WhatsApp</label>
                      <input {...register('patientPhone')} className="input-field" placeholder="(11) 99999-9999" />
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

                  {/* Resumo */}
                  <div className="bg-sage-50 rounded-2xl p-4 text-sm text-sage-700 space-y-1">
                    <p className="font-medium">Resumo da sessão</p>
                    <p>📅 {selectedDate && format(parseISO(selectedDate), "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
                    <p>⏰ {selectedTime} · {page.sessionDuration} minutos</p>
                    <p>💰 {formatCurrency(page.sessionPrice)}</p>
                  </div>

                  <button type="submit" disabled={isSubmitting}
                    className="btn-primary w-full flex items-center justify-center gap-2">
                    {isSubmitting
                      ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Enviando...</>
                      : 'Solicitar agendamento 💙'
                    }
                  </button>

                  <p className="text-xs text-neutral-400 text-center">
                    Ao solicitar, você concorda com o uso dos seus dados para agendamento e comunicação sobre a sessão.
                  </p>
                </form>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="text-center py-6 text-xs text-neutral-400">
        PsicoSaaS · Agendamento seguro e respeitoso 🔒
      </footer>
    </div>
  )
}
