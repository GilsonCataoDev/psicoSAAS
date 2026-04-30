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
  features: string[]
  highlight?: boolean
}

export const PLANS: Plan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: 79,
    priceYearly: 63,
    maxPatients: 30,
    maxStorage: 10,
    features: [
      'Agenda e pacientes',
      'Controle financeiro',
      'Página pública de agendamento',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 149,
    priceYearly: 119,
    maxPatients: -1,
    maxStorage: 50,
    highlight: true,
    features: [
      'Pacientes ilimitados',
      'Prontuário e documentos',
      'Relatórios e automações',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 249,
    priceYearly: 199,
    maxPatients: -1,
    maxStorage: 100,
    features: [
      'Tudo do Pro',
      'Suporte prioritário',
      'Recursos avançados de clínica',
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
  plan: 'basic',
  planId: 'basic',
  status: 'none',
}

function normalizeSubscription(subscription: Subscription): Subscription {
  const plan = subscription.plan ?? subscription.planId ?? 'basic'
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
    },
  ),
)
