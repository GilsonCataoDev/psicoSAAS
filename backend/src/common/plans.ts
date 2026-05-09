type PlanLimits = Record<string, { maxPatients: number; maxDocuments: number }>

export const PLAN_LIMITS: PlanLimits = {
  free:      { maxPatients: 10, maxDocuments: 0 },
  basic:     { maxPatients: 50, maxDocuments: 200 },
  essencial: { maxPatients: 50, maxDocuments: 200 },
  pro:       { maxPatients: -1, maxDocuments: -1 },
  premium:   { maxPatients: -1, maxDocuments: -1 },
}

export type KnownPlan = keyof typeof PLAN_LIMITS

export function normalizePlan(plan: string | null | undefined): KnownPlan {
  return plan && plan in PLAN_LIMITS ? plan as KnownPlan : 'free'
}
