export type PlanId = 'free' | 'pro'

export type PlanCatalogEntry = {
  id: PlanId
  name: string
  price: number
  maxPatients: number
}

export const PLAN_CATALOG = [
  { id: 'free', name: 'Grátis', price: 0, maxPatients: 10 },
  { id: 'pro', name: 'Pro', price: 97.90, maxPatients: -1 },
] as const satisfies readonly PlanCatalogEntry[]
