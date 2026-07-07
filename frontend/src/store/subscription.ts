import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { migratePersistedStorage } from '@/lib/storageMigration'

migratePersistedStorage('usecognia-subscription', 'psicosaas-subscription')

export type PlanId = string
export type SubscriptionStatus =
  | 'pending'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'cancelled'
  | 'none'

export interface Plan {
  id: PlanId
  name: string
  price: number
  priceYearly: number
  maxPatients: number
  maxStorage: number
  audience: string
  features: string[]
  highlight?: boolean
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Grátis',
    price: 0,
    priceYearly: 0,
    maxPatients: 10,
    maxStorage: 1,
    audience: 'Para estagiários e profissionais testarem a rotina sem custo',
    features: [
      'Agenda basica',
      'Ate 10 pacientes ativos',
      'Link publico simples',
      'Financeiro basico',
      'Sem documentos/PDF',
      'Sem instrumentos clinicos',
      'Sem WhatsApp automatico',
    ],
  },
  {
    id: 'essencial',
    name: 'Essencial',
    price: 79,
    priceYearly: 63,
    maxPatients: 50,
    maxStorage: 10,
    audience: 'Para psicólogo ou terapeuta solo organizar agenda, pacientes, documentos e financeiro',
    features: [
      'Agenda, pacientes e sessões',
      'Link público de agendamento',
      'Até 200 documentos/PDF com verificação',
      'Financeiro básico',
      'WhatsApp manual com mensagem pronta',
      'Sem instrumentos clinicos',
      'Até 50 pacientes ativos',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 149,
    priceYearly: 119,
    maxPatients: -1,
    maxStorage: 50,
    audience: 'Para psicólogos e terapeutas que querem automação, instrumentos, WhatsApp e IA',
    highlight: true,
    features: [
      'Tudo do Essencial',
      'Pacientes ilimitados',
      'Documentos ilimitados',
      'Instrumentos clinicos',
      'Financeiro Pro com links de pagamento',
      'WhatsApp automático e modelos personalizados',
      'Lembretes de consulta e cobrança',
      'Gravação e transcrição de sessões com IA',
      'Relatórios avançados para decisão',
    ],
  },
]

export interface Subscription {
  id?: string
  plan?: PlanId | string
  planId?: PlanId | string
  status: SubscriptionStatus
  gatewayCustomerId?: string | null
  gatewaySubscriptionId?: string | null
  currentPeriodEnd?: string | null
  trialEndsAt?: string | null
  cancelAtPeriodEnd?: boolean
  createdAt?: string
}

interface SubscriptionState {
  subscription: Subscription
  isLoaded: boolean
  setSubscription: (s: Subscription) => void
  setSubscriptionStatus: (status: SubscriptionStatus) => void
  resetSubscription: () => void
  invalidateSubscription: () => void
}

const emptySubscription: Subscription = {
  plan: 'free',
  planId: 'free',
  status: 'none',
}

function normalizeSubscription(subscription: Subscription): Subscription {
  const plan = subscription.plan ?? subscription.planId ?? 'free'
  return { ...subscription, plan, planId: plan }
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set) => ({
      subscription: emptySubscription,
      isLoaded: false,

      setSubscription: (subscription) =>
        set({ subscription: normalizeSubscription(subscription), isLoaded: true }),

      setSubscriptionStatus: (status) =>
        set((state) => ({ subscription: { ...state.subscription, status }, isLoaded: true })),

      resetSubscription: () => set({ subscription: emptySubscription, isLoaded: true }),

      // Usado ao trocar de identidade (login/logout/impersonation): limpa o
      // cache SEM marcar como "carregado" — isLoaded:true aqui faria as rotas
      // protegidas confiarem no status vazio e redirecionar para /planos antes
      // do /auth/bootstrap real responder.
      invalidateSubscription: () => set({ subscription: emptySubscription, isLoaded: false }),
    }),
    {
      name: 'usecognia-subscription',
      // isLoaded NUNCA vem do rehydrate — só vira true após setSubscription real
      // (via /auth/bootstrap). Caso contrário, o valor em cache local (possivelmente
      // desatualizado ou o default 'none') é tratado como definitivo e o usuário
      // é redirecionado para /planos antes da resposta real do servidor chegar.
      partialize: (state) => ({ subscription: state.subscription }),
    },
  ),
)

const PLAN_ORDER: Record<string, number> = { free: 0, basic: 1, essencial: 1, pro: 2, premium: 2 }

export function useHasPlan(minPlan: 'essencial' | 'pro' | 'premium'): boolean {
  const { subscription } = useSubscriptionStore()
  const active = subscription.status === 'active' || subscription.status === 'trialing'
  const plan = subscription.plan ?? 'free'
  return active && (PLAN_ORDER[plan] ?? 0) >= (PLAN_ORDER[minPlan] ?? 99)
}
