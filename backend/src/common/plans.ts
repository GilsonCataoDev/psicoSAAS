type PlanLimits = Record<string, {
  maxPatients: number
  maxDocuments: number
  transcriptionMonthlySeconds: number
  aiTextMonthlyLimit: number
  neuropsychAiMonthlyLimit: number
}>

export const PLAN_PRICES: Readonly<Record<string, number>> = Object.freeze({
  essencial: 79,
  pro: 149,
})

// Teto mensal do Copiloto de Raciocínio Clínico (plano Pro). Configurável via
// env para permitir ajuste de custo sem deploy de código.
const NEUROPSYCH_AI_MONTHLY_LIMIT = Number(process.env.NEUROPSYCH_AI_MONTHLY_LIMIT ?? 30) || 30

function nonNegativeIntEnv(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback)
  return Number.isInteger(value) && value >= 0 ? value : fallback
}

const AI_TEXT_ESSENCIAL_MONTHLY_LIMIT = nonNegativeIntEnv('AI_TEXT_ESSENCIAL_MONTHLY_LIMIT', 30)
const AI_TEXT_PRO_MONTHLY_LIMIT = nonNegativeIntEnv('AI_TEXT_PRO_MONTHLY_LIMIT', 150)

export const PLAN_LIMITS: PlanLimits = {
  free:      { maxPatients: 10, maxDocuments: 0, transcriptionMonthlySeconds: 0, aiTextMonthlyLimit: 0, neuropsychAiMonthlyLimit: 0 },
  basic:     { maxPatients: 50, maxDocuments: 200, transcriptionMonthlySeconds: 10 * 60, aiTextMonthlyLimit: AI_TEXT_ESSENCIAL_MONTHLY_LIMIT, neuropsychAiMonthlyLimit: 0 },
  essencial: { maxPatients: 50, maxDocuments: 200, transcriptionMonthlySeconds: 10 * 60, aiTextMonthlyLimit: AI_TEXT_ESSENCIAL_MONTHLY_LIMIT, neuropsychAiMonthlyLimit: 0 },
  pro:       { maxPatients: -1, maxDocuments: -1, transcriptionMonthlySeconds: 120 * 60, aiTextMonthlyLimit: AI_TEXT_PRO_MONTHLY_LIMIT, neuropsychAiMonthlyLimit: NEUROPSYCH_AI_MONTHLY_LIMIT },
  premium:   { maxPatients: -1, maxDocuments: -1, transcriptionMonthlySeconds: 120 * 60, aiTextMonthlyLimit: AI_TEXT_PRO_MONTHLY_LIMIT, neuropsychAiMonthlyLimit: NEUROPSYCH_AI_MONTHLY_LIMIT },
}

export type KnownPlan = keyof typeof PLAN_LIMITS

export function normalizePlan(plan: string | null | undefined): KnownPlan {
  return plan && plan in PLAN_LIMITS ? plan as KnownPlan : 'free'
}
