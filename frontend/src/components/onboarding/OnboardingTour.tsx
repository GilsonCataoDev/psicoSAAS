import { ArrowRight, CalendarDays, CheckCircle2, FileText, Sparkles, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

const steps = [
  {
    icon: Sparkles,
    title: 'Bem-vindo ao UseCognia',
    text: 'Aqui voce controla agenda, pacientes, prontuario e financeiro em um fluxo simples.',
    cta: 'Comecar',
    path: '/',
  },
  {
    icon: Users,
    title: 'Crie seu primeiro paciente',
    text: 'Use apenas nome e WhatsApp para sair do zero rapido. O resto pode completar depois.',
    cta: 'Ir para pacientes',
    path: '/patients',
  },
  {
    icon: CalendarDays,
    title: 'Agende a primeira sessao',
    text: 'Depois de criar o paciente, marque uma sessao na agenda visual.',
    cta: 'Ir para agenda',
    path: '/agenda',
  },
  {
    icon: FileText,
    title: 'Registre o prontuario',
    text: 'Durante ou apos a sessao, salve uma nota breve. Esse e o momento que mostra valor.',
    cta: 'Entendi',
    path: '/patients',
  },
  {
    icon: FileText,
    title: 'Gere documentos quando precisar',
    text: 'Recibos, declaracoes e registros ficam organizados sem retrabalho.',
    cta: 'Ver documentos',
    path: '/documents',
  },
  {
    icon: CheckCircle2,
    title: 'Pronto para registrar a primeira sessao',
    text: 'Quando finalizar a primeira sessao, o dashboard mostra o impacto economizado.',
    cta: 'Concluir',
    path: '/',
  },
]

export default function OnboardingTour() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)
  const [saving, setSaving] = useState(false)
  const currentStep = Math.min(user?.onboardingStep ?? 0, steps.length - 1)
  const step = useMemo(() => steps[currentStep], [currentStep])

  if (!user || user.firstLogin === false) return null

  const Icon = step.icon

  async function saveProgress(payload: { firstLogin?: boolean; onboardingStep?: number }) {
    setSaving(true)
    try {
      const { data } = await api.patch('/auth/onboarding', payload)
      updateUser(data)
    } catch {
      toast.error('Nao foi possivel salvar o progresso do tour.')
    } finally {
      setSaving(false)
    }
  }

  async function next() {
    if (currentStep >= steps.length - 1) {
      await saveProgress({ firstLogin: false, onboardingStep: steps.length })
      return
    }

    const nextStep = currentStep + 1
    await saveProgress({ onboardingStep: nextStep })
    navigate(steps[nextStep].path)
  }

  async function skip() {
    await saveProgress({ firstLogin: false, onboardingStep: steps.length })
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/55 p-4 backdrop-blur-sm sm:items-center">
      <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sage-300/60 bg-sage-300/10 shadow-[0_0_0_9999px_rgba(2,6,23,0.28)] animate-pulse" />

      <div className="relative w-full max-w-md rounded-3xl border border-white/15 bg-white p-5 shadow-2xl dark:bg-cognia-panel dark:text-white">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sage-100 text-sage-700 dark:bg-sage-500/20 dark:text-sage-200">
            <Icon size={24} />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sage-600 dark:text-sage-300">
              Passo {currentStep + 1} de {steps.length}
            </p>
            <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{step.title}</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">{step.text}</p>
          </div>
        </div>

        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-sage-500 transition-all"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={skip}
            disabled={saving}
            className="h-11 rounded-xl px-4 text-sm font-medium text-gray-500 hover:text-gray-800 disabled:opacity-60 dark:text-gray-300"
          >
            Pular
          </button>
          <button
            type="button"
            onClick={next}
            disabled={saving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sage-600 px-5 text-sm font-semibold text-white hover:bg-sage-700 disabled:opacity-60"
          >
            {saving ? 'Salvando...' : step.cta}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
