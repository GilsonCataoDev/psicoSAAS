import { useState } from 'react'
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  ClipboardList,
  FileText,
  GraduationCap,
  MessageCircle,
  Sparkles,
  UserRound,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import {
  OnboardingObjective,
  OnboardingPatientVolume,
  OnboardingUsageMode,
  useOnboardingStore,
} from '@/store/onboarding'
import { track, EVENTS } from '@/lib/analytics'
import { cn } from '@/lib/utils'

type Option<T extends string> = {
  value: T
  label: string
  description?: string
  icon: typeof Users
}

const OBJECTIVE_OPTIONS: Option<OnboardingObjective>[] = [
  { value: 'reminders', label: 'Reduzir faltas', description: 'Lembretes e confirmacoes', icon: MessageCircle },
  { value: 'agenda', label: 'Controlar agenda', description: 'Horarios, link publico e rotina', icon: CalendarDays },
  { value: 'records', label: 'Organizar prontuarios', description: 'Historico clinico em um lugar', icon: ClipboardList },
  { value: 'financial', label: 'Gestao financeira', description: 'Recebimentos e cobrancas', icon: Wallet },
  { value: 'documents', label: 'Documentos', description: 'Recibos e declaracoes', icon: FileText },
]

const USAGE_OPTIONS: Option<OnboardingUsageMode>[] = [
  { value: 'solo', label: 'So para mim', icon: UserRound },
  { value: 'assistant', label: 'Eu e atendente', icon: Users },
  { value: 'clinic', label: 'Clinica com equipe', icon: Building2 },
]

const PATIENT_OPTIONS: Option<OnboardingPatientVolume>[] = [
  { value: '0_5', label: '0 a 5', icon: CalendarDays },
  { value: '6_10', label: '6 a 10', icon: CalendarDays },
  { value: 'more_10', label: 'Mais de 10', icon: CalendarDays },
  { value: 'student', label: 'Sou estudante', icon: GraduationCap },
]

export default function OnboardingWizard() {
  const { setProfile, skip } = useOnboardingStore()
  const [objectives, setObjectives] = useState<OnboardingObjective[]>(['agenda'])
  const [usageMode, setUsageMode] = useState<OnboardingUsageMode>('solo')
  const [patientVolume, setPatientVolume] = useState<OnboardingPatientVolume>('0_5')
  const [closing, setClosing] = useState(false)

  function toggleObjective(value: OnboardingObjective) {
    setObjectives(current => {
      if (current.includes(value)) {
        const next = current.filter(item => item !== value)
        return next.length ? next : current
      }
      return [...current, value]
    })
  }

  function finish() {
    const profile = { objectives, usageMode, patientVolume }
    setProfile(profile)
    track(EVENTS.ONBOARDING_DONE, {
      objectives: objectives.join(','),
      usageMode,
      patientVolume,
    })
  }

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
            <p className="text-sm font-semibold text-neutral-800">Personalize seu inicio</p>
            <p className="text-xs text-neutral-400">3 escolhas rapidas para sugerirmos os proximos passos.</p>
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

      <div className="space-y-5 px-5 py-5">
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-sage-700">Objetivo principal</p>
          <div className="grid gap-2 md:grid-cols-3">
            {OBJECTIVE_OPTIONS.map(option => (
              <ChoiceCard
                key={option.value}
                option={option}
                selected={objectives.includes(option.value)}
                onClick={() => toggleObjective(option.value)}
              />
            ))}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-sage-700">Forma de uso</p>
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {USAGE_OPTIONS.map(option => (
                <ChoiceCard
                  key={option.value}
                  option={option}
                  selected={usageMode === option.value}
                  onClick={() => setUsageMode(option.value)}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-sage-700">Quantidade de pacientes</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {PATIENT_OPTIONS.map(option => (
                <ChoiceCard
                  key={option.value}
                  option={option}
                  selected={patientVolume === option.value}
                  onClick={() => setPatientVolume(option.value)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-sage-50 bg-sage-50/55 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-sage-800">
          Voce pode mudar tudo depois nas configuracoes.
        </p>
        <button
          type="button"
          onClick={finish}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-sage-600 px-4 text-sm font-semibold text-white hover:bg-sage-700"
        >
          Ver sugestoes <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  )
}

function ChoiceCard<T extends string>({
  option,
  selected,
  onClick,
}: {
  option: Option<T>
  selected: boolean
  onClick: () => void
}) {
  const Icon = option.icon
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative min-h-[92px] rounded-2xl border bg-white p-4 text-left transition-all hover:border-sage-300 hover:bg-sage-50/30',
        selected ? 'border-sage-500 ring-1 ring-sage-500' : 'border-neutral-100',
      )}
    >
      <span className={cn(
        'absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-md border',
        selected ? 'border-sage-600 bg-sage-600 text-white' : 'border-neutral-300 text-transparent',
      )}>
        <Check className="h-3.5 w-3.5" />
      </span>
      <Icon className={cn('mb-4 h-6 w-6', selected ? 'text-sage-600' : 'text-neutral-300')} />
      <span className="block pr-5 text-sm font-semibold text-neutral-800">{option.label}</span>
      {option.description && (
        <span className="mt-1 block text-xs leading-snug text-neutral-400">{option.description}</span>
      )}
    </button>
  )
}
