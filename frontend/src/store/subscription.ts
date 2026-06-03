import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
    name: 'Gratis',
    price: 0,
    priceYearly: 0,
    maxPatients: 10,
    maxStorage: 1,
    audience: 'Para testar e organizar os primeiros atendimentos',
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
    audience: 'Para psicólogo solo organizando a rotina',
    features: [
      'Agenda, pacientes e sessões',
      'Link público de agendamento',
      'Documentos e PDF com verificação',
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
    audience: 'Para psicólogos que querem automatizar cobranças e comunicação',
    highlight: true,
    features: [
      'Tudo do Essencial',
      'Pacientes ilimitados',
      'Documentos ilimitados',
      'Instrumentos clinicos',
      'Financeiro Pro com links de pagamento',
      'WhatsApp automático e modelos personalizados',
      'Lembretes de consulta e cobrança',
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
    }),
    {
      name: 'psicosaas-subscription',
      partialize: (state) => ({ subscription: state.subscription }),
      onRehydrateStorage: () => (state) => {
        if (state) state.isLoaded = true
      },
    },
  ),
)
