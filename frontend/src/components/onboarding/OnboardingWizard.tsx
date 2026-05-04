import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, Users, Link2, Check, X, ChevronRight, Sparkles } from 'lucide-react'
import { useOnboardingStore, OnboardingStep } from '@/store/onboarding'
import { track, EVENTS } from '@/lib/analytics'
import { cn } from '@/lib/utils'

const STEPS = [
  {
    id: 'availability' as OnboardingStep,
    icon: CalendarDays,
    color: 'bg-sage-500',
    title: 'Configure seus horários',
    description: 'Defina seus dias e horários disponíveis para atendimento.',
    cta: 'Configurar agenda',
    ctaLink: '/agendamentos?tab=settings',
    tip: 'Ative os dias da semana e defina o início/fim do expediente.',
  },
  {
    id: 'first_patient' as OnboardingStep,
    icon: Users,
    color: 'bg-mist-500',
    title: 'Adicione seu primeiro paciente',
    description: 'Cadastre um paciente para comecar a usar prontuario, agenda e financeiro.',
    cta: 'Adicionar paciente',
    ctaLink: '/pacientes',
    tip: 'Os dados sensiveis ficam protegidos e organizados em um unico lugar.',
  },
  {
    id: 'booking_page' as OnboardingStep,
    icon: Link2,
    color: 'bg-violet-500',
    title: 'Ative sua página de agendamento',
    description: 'Crie seu link público para que pacientes agendem online sem te ligar.',
    cta: 'Configurar link',
    ctaLink: '/agendamentos',
    tip: 'Você recebe notificação por WhatsApp a cada nova solicitação.',
  },
]

export default function OnboardingWizard() {
  const { currentStep, stepsCompleted, completeStep, skip } = useOnboardingStore()
  const [closing, setClosing] = useState(false)
  const navigate = useNavigate()

  const currentIdx = STEPS.findIndex(s => s.id === currentStep)
  const step = STEPS[currentIdx] ?? STEPS[0]
  const progress = (stepsCompleted.length / STEPS.length) * 100

  function handleCta() {
    track(EVENTS.ONBOARDING_STEP, { step: step.id })
    completeStep(step.id)
    navigate(step.ctaLink)
  }

  function handleSkip() {
    setClosing(true)
    setTimeout(() => { skip(); track(EVENTS.ONBOARDING_DONE) }, 200)
  }

  if (closing) return null

  return (
    <div className="bg-white rounded-3xl border border-sage-100 shadow-card overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-sage-50 rounded-xl flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-sage-500" />
          </div>
          <div>
            <p className="font-medium text-neutral-800 text-sm">Configure sua conta</p>
            <p className="text-xs text-neutral-400">{stepsCompleted.length} de {STEPS.length} etapas concluídas</p>
          </div>
        </div>
        <button
          onClick={handleSkip}
          className="text-neutral-300 hover:text-neutral-500 transition-colors p-1 -mt-0.5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Barra de progresso */}
      <div className="h-1 bg-neutral-100 mx-5 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-sage-400 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="px-5 pb-5 space-y-2">
        {STEPS.map((s, i) => {
          const isDone = stepsCompleted.includes(s.id)
          const isCurrent = s.id === currentStep && !isDone

          return (
            <div
              key={s.id}
              className={cn(
                'rounded-2xl p-4 transition-all border',
                isCurrent
                  ? 'border-sage-200 bg-sage-50'
                  : isDone
                    ? 'border-transparent bg-neutral-50'
                    : 'border-transparent opacity-50',
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                  isDone ? 'bg-emerald-100' : s.color,
                )}>
                  {isDone
                    ? <Check className="w-4 h-4 text-emerald-600" />
                    : <s.icon className="w-4 h-4 text-white" />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-medium',
                    isDone ? 'text-neutral-400 line-through' : 'text-neutral-800',
                  )}>
                    {s.title}
                  </p>
                  {isCurrent && (
                    <>
                      <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
                        {s.description}
                      </p>
                      <p className="text-xs text-sage-600 mt-1">💡 {s.tip}</p>
                      <button
                        onClick={handleCta}
                        className="mt-3 inline-flex items-center gap-1.5 bg-sage-500 hover:bg-sage-600 text-white text-xs font-medium px-3 py-1.5 rounded-xl transition-colors"
                      >
                        {s.cta}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Número da etapa */}
                {!isDone && !isCurrent && (
                  <span className="text-xs text-neutral-300 font-medium shrink-0">{i + 1}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
