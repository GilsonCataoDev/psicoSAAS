import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Check, FileText, Link2, MessageSquareText, Sparkles, Users, X } from 'lucide-react'
import { useBookingPage, useDocuments, usePatients, useWhatsAppStatus } from '@/hooks/useApi'
import { useOnboardingStore } from '@/store/onboarding'
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
  const { data: patients = [] } = usePatients()
  const { data: bookingPage } = useBookingPage()
  const { data: whatsapp } = useWhatsAppStatus()
  const { data: documents = [] } = useDocuments()

  const items = useMemo<ChecklistItem[]>(() => [
    {
      id: 'first_patient',
      title: 'Cadastre o primeiro paciente',
      description: 'Desbloqueia agenda, prontuario, financeiro e documentos.',
      cta: 'Adicionar paciente',
      href: '/pacientes?new=1',
      done: patients.length > 0,
      icon: Users,
    },
    {
      id: 'booking_page',
      title: 'Ative o link publico',
      description: 'Pacientes podem solicitar horarios sem conversa manual.',
      cta: 'Configurar link',
      href: '/agendamentos',
      done: Boolean(bookingPage?.isActive && bookingPage?.slug),
      icon: Link2,
    },
    {
      id: 'whatsapp',
      title: 'Conecte o WhatsApp',
      description: 'Confirme sessoes e teste automacoes pelo seu numero.',
      cta: 'Conectar WhatsApp',
      href: '/configuracoes',
      done: Boolean(whatsapp?.connected),
      icon: MessageSquareText,
    },
    {
      id: 'first_document',
      title: 'Gere o primeiro documento',
      description: 'Mostra o valor dos PDFs com verificacao publica.',
      cta: 'Gerar documento',
      href: '/documentos?new=1',
      done: documents.length > 0,
      icon: FileText,
    },
  ], [bookingPage, documents.length, patients.length, whatsapp])

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
      <div className="flex items-start justify-between gap-4 px-5 pt-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage-50">
            <Sparkles className="h-4 w-4 text-sage-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-800">Setup rapido do consultorio</p>
            <p className="text-xs text-neutral-400">{doneCount} de {items.length} etapas concluidas</p>
          </div>
        </div>
        <button onClick={handleSkip} className="p-1 text-neutral-300 transition-colors hover:text-neutral-500" aria-label="Fechar onboarding">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mx-5 mt-4 h-1.5 overflow-hidden rounded-full bg-neutral-100">
        <div className="h-full rounded-full bg-sage-500 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <div className="grid gap-2 p-5 lg:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon
          const isNext = nextItem?.id === item.id

          return (
            <Link
              key={item.id}
              to={item.href}
              onClick={() => track(EVENTS.ONBOARDING_STEP, { step: item.id })}
              className={cn(
                'rounded-2xl border p-4 transition-colors',
                item.done
                  ? 'border-emerald-100 bg-emerald-50/60'
                  : isNext
                    ? 'border-sage-200 bg-sage-50 hover:bg-sage-100/70'
                    : 'border-neutral-100 bg-neutral-50/70 hover:bg-neutral-100',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                  item.done ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-sage-700',
                )}>
                  {item.done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                {isNext && !item.done && (
                  <span className="rounded-full bg-sage-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Agora
                  </span>
                )}
              </div>

              <p className={cn('mt-3 text-sm font-semibold', item.done ? 'text-emerald-800' : 'text-neutral-800')}>
                {item.title}
              </p>
              <p className="mt-1 min-h-10 text-xs leading-relaxed text-neutral-500">{item.description}</p>
              <p className={cn('mt-3 text-xs font-semibold', item.done ? 'text-emerald-700' : 'text-sage-700')}>
                {item.done ? 'Concluido' : item.cta}
              </p>
            </Link>
          )
        })}
      </div>

      <div className="border-t border-sage-50 bg-sage-50/55 px-5 py-3">
        <p className="flex items-center gap-2 text-xs text-sage-800">
          <CalendarDays className="h-3.5 w-3.5" />
          A meta e chegar no primeiro agendamento confirmado em menos de 15 minutos.
        </p>
      </div>
    </section>
  )
}
