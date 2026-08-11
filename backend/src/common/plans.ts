type PlanLimits = Record<string, {
  maxPatients: number
  maxDocuments: number
  transcriptionMonthlySeconds: number
  aiTextMonthlyLimit: number
  neuropsychAiMonthlyLimit: number
  callTranscriptionMonthlyLimit: number
}>

export const PLAN_PRICES: Readonly<Record<string, number>> = Object.freeze({
  pro: 97.90,
})

// Teto mensal do Copiloto de Raciocínio Clínico (plano Pro). Configurável via
// env para permitir ajuste de custo sem deploy de código.
const NEUROPSYCH_AI_MONTHLY_LIMIT = Number(process.env.NEUROPSYCH_AI_MONTHLY_LIMIT ?? 30) || 30

function nonNegativeIntEnv(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback)
  return Number.isInteger(value) && value >= 0 ? value : fallback
}

const AI_TEXT_PRO_MONTHLY_LIMIT = nonNegativeIntEnv('AI_TEXT_PRO_MONTHLY_LIMIT', 150)

// Cota separada da transcrição manual (transcriptionMonthlySeconds, em
// minutos/mês, pensada pra ditado avulso de evolução). Transcrição de
// chamada grava a sessão inteira, então é contada por número de sessões/mês
// em vez de minutos — do contrário, um psicólogo com agenda cheia estoura o
// teto de minutos em poucos dias. Configurável via env pra ajustar sem deploy.
const CALL_TRANSCRIPTION_PRO_MONTHLY_LIMIT = nonNegativeIntEnv('CALL_TRANSCRIPTION_PRO_MONTHLY_LIMIT', 30)

export const PLAN_LIMITS: PlanLimits = {
  free: { maxPatients: 10, maxDocuments: 0, transcriptionMonthlySeconds: 0, aiTextMonthlyLimit: 0, neuropsychAiMonthlyLimit: 0, callTranscriptionMonthlyLimit: 0 },
  pro:  { maxPatients: -1, maxDocuments: -1, transcriptionMonthlySeconds: 120 * 60, aiTextMonthlyLimit: AI_TEXT_PRO_MONTHLY_LIMIT, neuropsychAiMonthlyLimit: NEUROPSYCH_AI_MONTHLY_LIMIT, callTranscriptionMonthlyLimit: CALL_TRANSCRIPTION_PRO_MONTHLY_LIMIT },
}

export type KnownPlan = keyof typeof PLAN_LIMITS

export const LATEST_SUBSCRIPTION_ORDER = { createdAt: 'DESC' } as const

const PLAN_ORDER: Readonly<Record<KnownPlan, number>> = Object.freeze({
  free: 0,
  pro: 1,
})

const DEFAULT_COMPED_PRO_EMAILS = 'gilsonfilho96@outlook.com'

export function normalizePlan(plan: string | null | undefined): KnownPlan {
  return plan && plan in PLAN_LIMITS ? plan as KnownPlan : 'free'
}

export function isCompedProEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const configured = process.env.COMPED_PRO_EMAILS ?? DEFAULT_COMPED_PRO_EMAILS
  const normalized = email.trim().toLowerCase()
  return configured
    .split(',')
    .some(candidate => candidate.trim().toLowerCase() === normalized)
}

export function resolveEffectivePlan(
  subscription: { plan?: string | null; status?: string | null } | null | undefined,
  email?: string | null,
): KnownPlan {
  if (isCompedProEmail(email)) return 'pro'
  const active = subscription?.status === 'active' || subscription?.status === 'trialing'
  return normalizePlan(active ? subscription?.plan : 'free')
}

export function hasPlanAccess(current: KnownPlan, required: KnownPlan): boolean {
  return PLAN_ORDER[current] >= PLAN_ORDER[required]
}
