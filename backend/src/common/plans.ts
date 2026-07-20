type PlanLimits = Record<string, {
  maxPatients: number
  maxDocuments: number
  transcriptionMonthlySeconds: number
  neuropsychAiMonthlyLimit: number
}>

// Teto mensal do Copiloto de Raciocínio Clínico (plano Pro). Configurável via
// env para permitir ajuste de custo sem deploy de código.
const NEUROPSYCH_AI_MONTHLY_LIMIT = Number(process.env.NEUROPSYCH_AI_MONTHLY_LIMIT ?? 30) || 30

export const PLAN_LIMITS: PlanLimits = {
  free:      { maxPatients: 10, maxDocuments: 0, transcriptionMonthlySeconds: 0, neuropsychAiMonthlyLimit: 0 },
  basic:     { maxPatients: 50, maxDocuments: 200, transcriptionMonthlySeconds: 10 * 60, neuropsychAiMonthlyLimit: 0 },
  essencial: { maxPatients: 50, maxDocuments: 200, transcriptionMonthlySeconds: 10 * 60, neuropsychAiMonthlyLimit: 0 },
  pro:       { maxPatients: -1, maxDocuments: -1, transcriptionMonthlySeconds: 120 * 60, neuropsychAiMonthlyLimit: NEUROPSYCH_AI_MONTHLY_LIMIT },
  premium:   { maxPatients: -1, maxDocuments: -1, transcriptionMonthlySeconds: 120 * 60, neuropsychAiMonthlyLimit: NEUROPSYCH_AI_MONTHLY_LIMIT },
}

export type KnownPlan = keyof typeof PLAN_LIMITS

export function normalizePlan(plan: string | null | undefined): KnownPlan {
  return plan && plan in PLAN_LIMITS ? plan as KnownPlan : 'free'
}
