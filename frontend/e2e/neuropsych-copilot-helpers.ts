import { execFileSync } from 'child_process'
import { type Page } from '@playwright/test'
import { appPath, navigateApp, selectOptionByText } from './helpers'

/**
 * Helpers específicos do E2E do Copiloto Neuropsicológico.
 * Requer um backend local rodando com NEUROPSYCH_AI_MOCK_PROVIDER=true
 * (ver backend/.env.e2e-local) e um Postgres local acessível via PG_BIN/psql.
 * Nunca aponta para produção — todas as funções aqui assumem E2E_BASE_URL/
 * E2E_API_URL locais.
 */

const PG_BIN = process.env.PG_BIN ?? 'C:/pgtest/pgsql/bin'
const PG_CONN = {
  host: process.env.E2E_PG_HOST ?? 'localhost',
  port: process.env.E2E_PG_PORT ?? '5544',
  db: process.env.E2E_PG_DB ?? 'usecognia_e2e',
  user: process.env.E2E_PG_USER ?? 'postgres',
}

export function execSql(sql: string): string {
  return execFileSync(`${PG_BIN}/psql.exe`, [
    '-h', PG_CONN.host, '-p', PG_CONN.port, '-U', PG_CONN.user, '-d', PG_CONN.db,
    '-t', '-A', '-c', sql,
  ], { encoding: 'utf-8' }).trim()
}

/** Marcadores lidos pelo mock do provedor (ver AiService.mockNeuropsychAnalysis). */
export const E2E_TRIGGERS = {
  invalidJson: '__E2E_INVALID_JSON__',
  timeout: '__E2E_TIMEOUT__',
  providerError: '__E2E_PROVIDER_ERROR__',
}

export async function startNeuropsychAssessment(page: Page, patientName: string) {
  await navigateApp(page, '/avaliacoes')
  await page.getByRole('button', { name: 'Iniciar avaliação' }).click()
  await selectOptionByText(page.locator('select').first(), patientName)
  await page.getByRole('button', { name: 'Iniciar' }).click()
  await page.waitForURL(/#\/avaliacoes\/[0-9a-f-]+/, { timeout: 15_000 })
  const match = page.url().match(/avaliacoes\/([0-9a-f-]+)/)
  if (!match) throw new Error('Não foi possível extrair o id da avaliação da URL')
  return match[1]
}

export async function goToAssessment(page: Page, assessmentId: string) {
  await page.goto(appPath(`/avaliacoes/${assessmentId}`))
  await page.getByText('Copiloto clínico (IA)').waitFor({ timeout: 15_000 })
}

/** Preenche o motivo de encaminhamento (campo simples, sempre disponível) com um marcador de teste. */
export async function setReferralQuestionText(page: Page, text: string) {
  const field = page.locator('textarea').first()
  await field.fill(text)
  await field.blur()
}

export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

/** Zera a franquia individual do Copiloto para o e-mail no mês atual e a deixa no limite (simula "limite atingido"). */
export function seedIndividualLimitReached(email: string, limit = 30) {
  const userIdQuery = execSql(`SELECT id FROM users WHERE email = '${email}'`)
  const userId = userIdQuery.trim()
  if (!userId) throw new Error(`Usuário ${email} não encontrado no banco local`)
  const month = currentMonth()
  execSql(`
    INSERT INTO ai_usage ("userId", month, "neuropsychAnalyses")
    VALUES ('${userId}', '${month}', ${limit})
    ON CONFLICT ("userId", month) DO UPDATE SET "neuropsychAnalyses" = ${limit}
  `)
  return userId
}

/** Preenche o ledger sentinela do orçamento global para o mês atual, simulando teto global atingido. */
export function seedGlobalBudgetReached(budgetUsd = 50) {
  const SENTINEL = '00000000-0000-0000-0000-000000000000'
  const month = currentMonth()
  const micros = budgetUsd * 1_000_000
  execSql(`
    INSERT INTO ai_usage ("userId", month, "neuropsychCostUsdMicros")
    VALUES ('${SENTINEL}', '${month}', ${micros})
    ON CONFLICT ("userId", month) DO UPDATE SET "neuropsychCostUsdMicros" = ${micros}
  `)
}

export function resetNeuropsychUsage(email: string) {
  const userIdQuery = execSql(`SELECT id FROM users WHERE email = '${email}'`)
  const userId = userIdQuery.trim()
  if (!userId) return
  const month = currentMonth()
  execSql(`UPDATE ai_usage SET "neuropsychAnalyses" = 0 WHERE "userId" = '${userId}' AND month = '${month}'`)
}
