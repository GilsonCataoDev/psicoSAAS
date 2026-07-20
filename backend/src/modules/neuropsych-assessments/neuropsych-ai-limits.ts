/**
 * Limites financeiros e técnicos do Copiloto de Raciocínio Clínico Neuropsicológico.
 * Todos configuráveis por variável de ambiente, com padrões conservadores.
 * Nenhum destes valores é aceito do frontend — cota e custo são sempre
 * calculados a partir de configuração do servidor.
 */

function positiveIntEnv(name: string, fallback: number): number {
  const raw = Number(process.env[name])
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : fallback
}

export const NEUROPSYCH_AI_LIMITS = {
  /** Franquia mensal de análises por conta no plano Pro. */
  monthlyAnalysesLimit: positiveIntEnv('NEUROPSYCH_AI_MONTHLY_LIMIT', 30),
  /** Tamanho máximo (em caracteres) do registro montado antes de virar prompt. */
  maxInputChars: positiveIntEnv('NEUROPSYCH_AI_MAX_INPUT_CHARS', 20000),
  /** Teto de tokens de saída pedido ao provedor por análise. */
  maxOutputTokens: positiveIntEnv('NEUROPSYCH_AI_MAX_OUTPUT_TOKENS', 3000),
  /** Timeout da chamada ao provedor de IA, em milissegundos. */
  timeoutMs: positiveIntEnv('NEUROPSYCH_AI_TIMEOUT_MS', 30000),
  /** Orçamento global mensal (todas as contas somadas), em dólares. */
  globalMonthlyBudgetUsd: positiveIntEnv('NEUROPSYCH_AI_GLOBAL_MONTHLY_BUDGET_USD', 50),
} as const
