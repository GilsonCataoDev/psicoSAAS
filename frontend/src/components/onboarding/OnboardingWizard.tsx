import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, Check, CreditCard, FileText, Link2, Sparkles, Users, X } from 'lucide-react'
import { useAvailability, useBookingPage, usePatients, useSessions } from '@/hooks/useApi'
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
  const [closing, setClosing] = useState(false)

  const { data: availability = [] } = useAvailability()
  const { data: patients = [] } = usePatients()
  const { data: bookingPage } = useBookingPage()
  const { data: sessions = [] } = useSessions()
  const subscription = useSubscriptionStore(s => s.subscription)

  const items = useMemo<ChecklistItem[]>(() => [
    {
      id: 'availability',
      title: 'Configure sua disponibilidade',
      description: 'Defina os dias e horários em que você atende.',
      cta: 'Configurar agenda',
      href: '/agendamentos',
      done: availability.length > 0,
      icon: CalendarDays,
    },
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
      id: 'booking_page',
      title: 'Ative o link de agendamento',
      description: 'Pacientes solicitam horários sem contato manual.',
      cta: 'Configurar link',
      href: '/agendamentos',
      done: Boolean(bookingPage?.isActive && bookingPage?.slug),
      icon: Link2,
    },
    {
      id: 'first_session',
      title: 'Registre a primeira evolução',
      description: 'Inicie o prontuário com a primeira sessão registrada.',
      cta: 'Registrar sessão',
      href: '/sessoes',
      done: sessions.length > 0,
      icon: FileText,
    },
    {
      id: 'plan',
      title: 'Confira seu plano e período de trial',
      description: 'Você tem 7 dias grátis. Conheça os recursos do seu plano.',
      cta: 'Ver planos',
      href: '/planos',
      done: subscription.status === 'active',
      icon: CreditCard,
    },
  ], [availability.length, bookingPage, patients.length, sessions.length, subscription.status])

  const doneCount = items.filter(item => item.done).length
  const progress = Math.round((doneCount / items.length) * 100)
  const nextItem = items.find(item => !item.done)

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

  return (
    <section className="overflow-hidden rounded-3xl border border-sage-100 bg-white shadow-card animate-slide-up">

      {/* ── Cabeçalho ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 px-5 pt-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage-50">
            <Sparkles className="h-4 w-4 text-sage-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-800">Setup rápido do consultório</p>
            <p className="text-xs text-neutral-400">{doneCount} de {items.length} etapas concluídas</p>
          </div>
        </div>
        <button
          onClick={handleSkip}
          className="p-1 text-neutral-300 transition-colors hover:text-neutral-500"
          aria-label="Fechar onboarding"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Barra de progresso ──────────────────────────────────── */}
      <div className="mx-5 mt-4 h-1.5 overflow-hidden rounded-full bg-neutral-100">
        <div
          className="h-full rounded-full bg-sage-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ── Checklist ───────────────────────────────────────────── */}
      <div className="divide-y divide-neutral-50 px-5 pb-2 pt-2">
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
                    : 'border-neutral-200 bg-white text-neutral-400',
              )}>
                {item.done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              </div>

              {/* Texto */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <p className={cn(
                    'text-sm font-medium leading-tight',
                    item.done ? 'text-neutral-400' : 'text-neutral-800',
                  )}>
                    {item.title}
                  </p>
                  {isNext && (
                    <span className="rounded-full bg-sage-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      Próximo
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-neutral-400 leading-snug">{item.description}</p>
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
                      : 'border border-neutral-200 text-neutral-500 hover:border-sage-300 hover:text-sage-700',
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
              className="flex items-center gap-3 py-3 rounded-xl transition-colors hover:bg-neutral-50/80 -mx-1 px-1"
            >
              {rowContent}
            </Link>
          )
        })}
      </div>

      {/* ── Rodapé ─────────────────────────────────────────────── */}
      <div className="border-t border-sage-50 bg-sage-50/55 px-5 py-3">
        <p className="flex items-center gap-2 text-xs text-sage-800">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
          Meta: chegue ao primeiro agendamento confirmado em menos de 15 minutos.
        </p>
      </div>

    </section>
  )
}
