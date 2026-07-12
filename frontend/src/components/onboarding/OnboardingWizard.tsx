import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, CalendarPlus, Check, Link2, MessageCircle, Sparkles, Users, X } from 'lucide-react'
import { useAppointments } from '@/hooks/api/appointments'
import { useBookingPage } from '@/hooks/api/booking'
import { usePatients } from '@/hooks/api/patients'
import { useWhatsAppStatus } from '@/hooks/api/notifications'
import { useOnboardingStore } from '@/store/onboarding'
import { useSubscriptionStore } from '@/store/subscription'
import { track, EVENTS } from '@/lib/analytics'
import { cn } from '@/lib/utils'

type ChecklistItem = {
  id: string
  title: string
  description: string
  cta: string
  href: string
  done: boolean
  icon: typeof Users
}

export default function OnboardingWizard() {
  const { complete, skip } = useOnboardingStore()
  const subscription = useSubscriptionStore(s => s.subscription)
  const plan = String(subscription.planId ?? subscription.plan ?? 'free')
  const hasProAutomation = plan === 'pro'
  const [closing, setClosing] = useState(false)

  const { data: patients = [] } = usePatients()
  const { data: appointments = [] } = useAppointments()
  const { data: bookingPage } = useBookingPage()
  const { data: whatsappStatus } = useWhatsAppStatus({ enabled: hasProAutomation })

  const items = useMemo<ChecklistItem[]>(() => [
    {
      id: 'first_patient',
      title: 'Adicione o primeiro paciente',
      description: 'Desbloqueia agenda, prontuário, financeiro e documentos.',
      cta: 'Adicionar paciente',
      href: '/pacientes?new=1',
      done: patients.length > 0,
      icon: Users,
    },
    {
      id: 'first_appointment',
      title: 'Agende a primeira sessão',
      description: 'Defina data, horário e modalidade para iniciar a rotina.',
      cta: 'Agendar sessão',
      href: '/agenda?new=1',
      done: appointments.length > 0,
      icon: CalendarPlus,
    },
    {
      id: 'booking_page',
      title: 'Configure seu link público',
      description: 'Permita que pacientes solicitem horários pelo seu link.',
      cta: 'Configurar link',
      href: '/agendamentos',
      done: Boolean(bookingPage?.isActive && bookingPage?.slug),
      icon: Link2,
    },
    ...(hasProAutomation ? [{
      id: 'whatsapp',
      title: 'Conecte o WhatsApp',
      description: 'Prepare lembretes automáticos para reduzir faltas.',
      cta: 'Conectar WhatsApp',
      href: '/configuracoes?tab=messages',
      done: Boolean(whatsappStatus?.connected),
      icon: MessageCircle,
    } as ChecklistItem] : []),
  ], [appointments.length, bookingPage, hasProAutomation, patients.length, whatsappStatus?.connected])

  const doneCount = items.filter(item => item.done).length
  const progress = Math.round((doneCount / items.length) * 100)
  const nextItem = items.find(item => !item.done)
  const isCompact = doneCount > 0 && Boolean(nextItem)

  useEffect(() => {
    if (doneCount === items.length) {
      track(EVENTS.ONBOARDING_DONE)
      complete()
    }
  }, [complete, doneCount, items.length])

  function handleSkip() {
    setClosing(true)
    setTimeout(() => skip(), 180)
  }

  if (closing) return null

  if (isCompact && nextItem) {
    const Icon = nextItem.icon

    return (
      <section className="overflow-hidden rounded-2xl border border-sage-100 bg-white p-4 shadow-card animate-slide-up dark:border-white/10 dark:bg-cognia-panel">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage-50 text-sage-600 dark:bg-sage-500/20 dark:text-sage-200">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-sage-700 dark:text-sage-300">
                Próximo passo
              </p>
              <h2 className="mt-0.5 text-sm font-semibold text-neutral-800 dark:text-white">{nextItem.title}</h2>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-300">{nextItem.description}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden text-xs font-medium text-neutral-400 sm:inline">{doneCount}/{items.length}</span>
            <Link
              to={nextItem.href}
              onClick={() => track(EVENTS.ONBOARDING_STEP, { step: nextItem.id })}
              className="inline-flex h-9 items-center justify-center gap-1 rounded-xl bg-sage-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-sage-700"
            >
              {nextItem.cta}
              <ArrowRight className="h-3 w-3" />
            </Link>
            <button
              onClick={handleSkip}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-neutral-300 transition-colors hover:bg-neutral-100 hover:text-neutral-500 dark:hover:bg-white/10 dark:hover:text-neutral-100"
              aria-label="Fechar onboarding"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-sage-100 bg-white shadow-card animate-slide-up dark:border-white/10 dark:bg-cognia-panel">

      {/* ── Cabeçalho ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 px-5 pt-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage-50 dark:bg-sage-500/20">
            <Sparkles className="h-4 w-4 text-sage-600 dark:text-sage-200" />
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-800 dark:text-white">Setup rápido do consultório</p>
            <p className="text-xs text-neutral-400 dark:text-neutral-300">{doneCount} de {items.length} etapas concluídas</p>
          </div>
        </div>
        <button
          onClick={handleSkip}
          className="p-1 text-neutral-300 transition-colors hover:text-neutral-500 dark:hover:text-neutral-100"
          aria-label="Fechar onboarding"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Barra de progresso ──────────────────────────────────── */}
      <div className="mx-5 mt-4 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-sage-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ── Checklist ───────────────────────────────────────────── */}
      <div className="divide-y divide-neutral-50 px-5 pb-2 pt-2 dark:divide-white/5">
        {items.map((item) => {
          const Icon = item.icon
          const isNext = !item.done && nextItem?.id === item.id

          const rowContent = (
            <>
              {/* Ícone de status */}
              <div className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2',
                item.done
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                  : isNext
                    ? 'border-sage-300 bg-sage-50 text-sage-600'
                  : 'border-neutral-200 bg-white text-neutral-400 dark:border-white/15 dark:bg-white/5 dark:text-neutral-300',
              )}>
                {item.done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              </div>

              {/* Texto */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <p className={cn(
                    'text-sm font-medium leading-tight',
                    item.done ? 'text-neutral-400 dark:text-neutral-400' : 'text-neutral-800 dark:text-white',
                  )}>
                    {item.title}
                  </p>
                  {isNext && (
                    <span className="rounded-full bg-sage-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      Próximo
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-300 leading-snug">{item.description}</p>
              </div>

              {/* CTA */}
              <div className="shrink-0">
                {item.done ? (
                  <span className="text-xs font-medium text-emerald-600">Concluído</span>
                ) : (
                  <span className={cn(
                    'flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors',
                    isNext
                      ? 'bg-sage-600 text-white hover:bg-sage-700'
                      : 'border border-neutral-200 text-neutral-500 hover:border-sage-300 hover:text-sage-700 dark:border-white/10 dark:text-neutral-300 dark:hover:border-sage-300/40 dark:hover:text-sage-200',
                  )}>
                    {item.cta}
                    <ArrowRight className="h-3 w-3" />
                  </span>
                )}
              </div>
            </>
          )

          return item.done ? (
            <div key={item.id} className="flex items-center gap-3 py-3 opacity-60">
              {rowContent}
            </div>
          ) : (
            <Link
              key={item.id}
              to={item.href}
              onClick={() => track(EVENTS.ONBOARDING_STEP, { step: item.id })}
              className="flex items-center gap-3 py-3 rounded-xl transition-colors hover:bg-neutral-50/80 -mx-1 px-1 dark:hover:bg-white/5"
            >
              {rowContent}
            </Link>
          )
        })}
      </div>

      {/* ── Rodapé ─────────────────────────────────────────────── */}
      <div className="border-t border-sage-50 bg-sage-50/55 px-5 py-3 dark:border-white/5 dark:bg-white/5">
        <p className="flex items-center gap-2 text-xs text-sage-800 dark:text-sage-200">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
          Meta: saia com paciente, primeira sessão e seu link público preparados.
        </p>
      </div>

    </section>
  )
}
