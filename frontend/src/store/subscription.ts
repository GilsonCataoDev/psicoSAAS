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
    maxPatients: 3,
    maxStorage: 1,
    audience: 'Para testar e organizar os primeiros atendimentos',
    features: [
      'Agenda basica',
      'Ate 3 pacientes ativos',
      'Link publico simples',
      'Financeiro basico',
      'Sem documentos/PDF',
      'Sem WhatsApp automatico',
    ],
  },
  {
    id: 'essencial',
    name: 'Essencial',
    price: 79,
    priceYearly: 63,
    maxPatients: 30,
    maxStorage: 10,
    audience: 'Para psicologo solo organizando a rotina',
    features: [
      'Agenda, pacientes e sessoes',
      'Link publico de agendamento',
      'Documentos e PDF com verificacao',
      'Financeiro basico',
      'WhatsApp manual com mensagem pronta',
      'Ate 30 pacientes ativos',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 149,
    priceYearly: 119,
    maxPatients: -1,
    maxStorage: 50,
    audience: 'Para psicologos que querem automatizar cobrancas e comunicacao',
    highlight: true,
    features: [
      'Tudo do Essencial',
      'Pacientes ilimitados',
      'Documentos ilimitados',
      'Financeiro Pro com links de pagamento',
      'WhatsApp automatico e modelos personalizados',
      'Lembretes de consulta e cobranca',
      'Relatorios avancados para decisao',
    ],
  },
  {
    id: 'premium',
    name: 'Clinica',
    price: 249,
    priceYearly: 199,
    maxPatients: -1,
    maxStorage: 100,
    audience: 'Para clinicas e equipes com mais de um profissional',
    features: [
      'Tudo do Pro',
      'Multiplos profissionais',
      'Agenda por profissional',
      'Visao administrativa da clinica',
      'Financeiro consolidado',
      'Suporte prioritario',
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
  plan: 'essencial',
  planId: 'essencial',
  status: 'none',
}

function normalizeSubscription(subscription: Subscription): Subscription {
  const plan = subscription.plan ?? subscription.planId ?? 'essencial'
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
