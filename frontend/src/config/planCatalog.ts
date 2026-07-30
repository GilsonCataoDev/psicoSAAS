export type PlanId = 'free' | 'essencial' | 'pro'

export type PlanCatalogEntry = {
  id: PlanId
  name: string
  price: number
  maxPatients: number
}

export const PLAN_CATALOG = [
  { id: 'free', name: 'Grátis', price: 0, maxPatients: 10 },
  { id: 'essencial', name: 'Essencial', price: 79, maxPatients: 50 },
  { id: 'pro', name: 'Pro', price: 149, maxPatients: -1 },
] as const satisfies readonly PlanCatalogEntry[]
