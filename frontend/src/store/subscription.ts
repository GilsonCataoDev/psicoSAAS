import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PlanId = 'free' | 'essencial' | 'pro'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled' | 'none'

export interface Plan {
  id: PlanId
  name: string
  price: number          // R$/mês
  priceYearly: number    // R$/mês cobrado anualmente
  maxPatients: number    // -1 = ilimitado
  maxStorage: number     // GB
  features: string[]
  highlight?: boolean
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Gratuito',
    price: 0,
    priceYearly: 0,
    maxPatients: 5,
    maxStorage: 1,
    features: [
      'Até 5 pessoas ativas',
      'Agenda básica',
      '1 GB de prontuário',
      'Página de agendamento público',
      'Suporte por e-mail',
    ],
  },
  {
    id: 'essencial',
    name: 'Essencial',
    price: 79,
    priceYearly: 63,
    maxPatients: 30,
    maxStorage: 10,
    highlight: true,
    features: [
      'Até 30 pessoas ativas',
      'Agenda + lembretes WhatsApp',
      '10 GB de prontuário',
      'Certificação digital de documentos',
      'Controle financeiro completo',
      'Página de agendamento público',
      'Suporte prioritário',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 149,
    priceYearly: 119,
    maxPatients: -1,
    maxStorage: 50,
    features: [
      'Pessoas ilimitadas',
      'Tudo do Essencial',
      'Relatórios e análises avançadas',
      'Múltiplas páginas de agendamento',
      'API de integração',
      'Backup diário automático',
      'Suporte via WhatsApp',
    ],
  },
]

export interface Subscription {
  planId: PlanId
  status: SubscriptionStatus
  trialEndsAt?: string     // ISO
  currentPeriodEnd?: string // ISO
  cancelAtPeriodEnd?: boolean
}

interface SubscriptionState {
  subscription: Subscription
  setSubscription: (s: Subscription) => void
  startTrial: (planId: PlanId) => void
}

// Padrão: 14 dias de trial no Essencial
const TRIAL_DAYS = 14
const trialEnd = new Date()
trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS)

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set) => ({
      subscription: {
        planId: 'essencial',
        status: 'trialing',
        trialEndsAt: trialEnd.toISOString(),
      },

      setSubscription: (s) => set({ subscription: s }),

      startTrial: (planId) => {
        const end = new Date()
        end.setDate(end.getDate() + TRIAL_DAYS)
        set({
          subscription: {
            planId,
            status: 'trialing',
            trialEndsAt: end.toISOString(),
          },
        })
      },
    }),
    { name: 'psicosaas-subscription' },
  ),
)
