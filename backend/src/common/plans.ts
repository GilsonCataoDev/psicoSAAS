type PlanLimits = Record<string, {
  maxPatients: number
  maxDocuments: number
  transcriptionMonthlySeconds: number
}>

export const PLAN_LIMITS: PlanLimits = {
  free:      { maxPatients: 10, maxDocuments: 0, transcriptionMonthlySeconds: 0 },
  basic:     { maxPatients: 50, maxDocuments: 200, transcriptionMonthlySeconds: 10 * 60 },
  essencial: { maxPatients: 50, maxDocuments: 200, transcriptionMonthlySeconds: 10 * 60 },
  pro:       { maxPatients: -1, maxDocuments: -1, transcriptionMonthlySeconds: 120 * 60 },
  premium:   { maxPatients: -1, maxDocuments: -1, transcriptionMonthlySeconds: 120 * 60 },
}

export type KnownPlan = keyof typeof PLAN_LIMITS

export function normalizePlan(plan: string | null | undefined): KnownPlan {
  return plan && plan in PLAN_LIMITS ? plan as KnownPlan : 'free'
}
