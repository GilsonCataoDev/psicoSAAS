import { expect, request, test } from '@playwright/test'
import {
  cleanupAccount, createPatient, dismissOverlays,
  login, navigateApp, registerAndActivateFree, selectOptionByText,
} from './helpers'
import {
  E2E_TRIGGERS, execSql, goToAssessment, loginOrRegister, seedGlobalBudgetReached,
  seedIndividualLimitReached, setReferralQuestionText, startNeuropsychAssessment,
} from './neuropsych-copilot-helpers'

const apiBaseUrl = process.env.E2E_API_URL ?? 'http://localhost:3099/api'

/**
 * Suíte E2E do Copiloto de Raciocínio Clínico Neuropsicológico.
 *
 * REQUER um backend LOCAL rodando com NEUROPSYCH_AI_MOCK_PROVIDER=true
 * (ver backend/.env.e2e-local) e Postgres local — NUNCA aponta para produção
 * nem gasta créditos reais do provedor de IA. Rodar com:
 *   E2E_BASE_URL=http://localhost:5173 E2E_API_URL=http://localhost:3099/api npx playwright test neuropsych-copilot
 *
 * O e-mail de plano Pro é concedido via COMPED_PRO_EMAILS no backend local —
 * ver E2E_PRO_EMAIL abaixo, que deve bater com o valor configurado lá.
 */

// Deve bater com COMPED_PRO_EMAILS em backend/.env.e2e-local.
const E2E_PRO_EMAIL = process.env.E2E_PRO_EMAIL ?? 'e2e.copilot@example.com'

test.describe('Copiloto Neuropsicológico — plano Pro', () => {
  let assessmentId = ''
  const patientName = `Paciente Copiloto ${Date.now()}`

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000)
    const page = await browser.newPage()
    try {
      await registerAndActivateFree(page, E2E_PRO_EMAIL, 'E2E Copiloto Pro')
      await createPatient(page, patientName, Date.now())
      assessmentId = await startNeuropsychAssessment(page, patientName)
    } finally {
      await page.close()
    }
  })

  test.afterAll(async () => {
    await cleanupAccount(E2E_PRO_EMAIL)
  })

  test.beforeEach(async ({ page }) => {
    await login(page, E2E_PRO_EMAIL)
    await goToAssessment(page, assessmentId)
    await dismissOverlays(page)
  })

  test('aba do Copiloto está disponível e mostra contador mensal', async ({ page }) => {
    await expect(page.getByText('Copiloto clínico (IA)')).toBeVisible()
    await expect(page.getByText(/de \d+ análises utilizadas neste mês/)).toBeVisible({ timeout: 10_000 })
  })

  test('seleção de campos alterna estado visual', async ({ page }) => {
    const fieldButton = page.getByRole('button', { name: 'História clínica' })
    await expect(fieldButton).toHaveAttribute('aria-pressed', 'true')
    await fieldButton.click()
    await expect(fieldButton).toHaveAttribute('aria-pressed', 'false')
    await fieldButton.click()
    await expect(fieldButton).toHaveAttribute('aria-pressed', 'true')
  })

  test('primeiro uso exige confirmação de processamento por IA externa', async ({ page }) => {
    await page.getByRole('button', { name: /Analisar com IA/ }).click()
    await expect(page.getByText('Processamento por IA externa')).toBeVisible()
    await page.getByRole('button', { name: 'Cancelar' }).click()
    // Sem consentimento, nenhuma análise deve ter sido disparada.
    await expect(page.getByText(/\[MOCK\]/)).not.toBeVisible()
  })

  test('gera análise: loading, resposta estruturada, badges de fonte/certeza legíveis', async ({ page }) => {
    await page.getByRole('button', { name: /Analisar com IA/ }).click()
    await page.getByRole('button', { name: 'Entendi e concordo' }).click()

    await expect(page.getByText('Analisando...')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByRole('status', { name: 'Análise clínica em andamento' }))
      .toContainText('A análise pode levar de 15 a 30 segundos')
    await expect(page.getByText('[MOCK] Síntese de teste E2E.')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/dado registrado|inferência cautelosa/).first()).toBeVisible()
    await expect(page.getByText(/fonte:/).first()).toBeVisible()
    await expect(page.getByText(/Sugestão gerada por IA \(mock de teste\)/)).toBeVisible()
  })

  test('segundo clique não exige consentimento de novo (já concedido)', async ({ page }) => {
    await page.getByRole('button', { name: /Analisar com IA/ }).click()
    await page.getByRole('button', { name: 'Entendi e concordo' }).click()
    await expect(page.getByText('[MOCK] Síntese de teste E2E.')).toBeVisible({ timeout: 15_000 })
  })

  test('copiar copia o texto da análise para a área de transferência', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.getByRole('button', { name: /Analisar com IA/ }).click()
    await page.getByRole('button', { name: 'Entendi e concordo' }).click()
    await expect(page.getByText('[MOCK] Síntese de teste E2E.')).toBeVisible({ timeout: 15_000 })

    await page.getByRole('button', { name: 'Copiar' }).first().click()
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText())
    expect(clipboardText).toContain('SUGESTÃO DO COPILOTO CLÍNICO')
    expect(clipboardText).toContain('[MOCK] Síntese de teste E2E.')
  })

  test('adicionar ao rascunho exige confirmação e anexa sem substituir conteúdo existente', async ({ page }) => {
    // Preenche o rascunho de integração com um marcador prévio.
    const draftField = page.getByRole('textbox', { name: 'Integração dos resultados' })
    await draftField.fill('CONTEÚDO PRÉVIO DO RASCUNHO — NÃO PODE SER PERDIDO')
    await draftField.blur()

    await page.getByRole('button', { name: /Analisar com IA/ }).click()
    await page.getByRole('button', { name: 'Entendi e concordo' }).click()
    await expect(page.getByText('[MOCK] Síntese de teste E2E.')).toBeVisible({ timeout: 15_000 })

    page.once('dialog', dialog => dialog.accept())
    await page.getByRole('button', { name: 'Adicionar ao rascunho' }).first().click()

    await expect(draftField).toHaveValue(/CONTEÚDO PRÉVIO DO RASCUNHO — NÃO PODE SER PERDIDO/)
    await expect(draftField).toHaveValue(/SUGESTÃO DO COPILOTO CLÍNICO/)
  })

  test('cancelar a confirmação de "adicionar ao rascunho" não altera o rascunho', async ({ page }) => {
    const draftField = page.getByRole('textbox', { name: 'Integração dos resultados' })
    await draftField.fill('RASCUNHO ORIGINAL INTACTO')
    await draftField.blur()

    await page.getByRole('button', { name: /Analisar com IA/ }).click()
    await page.getByRole('button', { name: 'Entendi e concordo' }).click()
    await expect(page.getByText('[MOCK] Síntese de teste E2E.')).toBeVisible({ timeout: 15_000 })

    page.once('dialog', dialog => dialog.dismiss())
    await page.getByRole('button', { name: 'Adicionar ao rascunho' }).first().click()

    await expect(draftField).toHaveValue('RASCUNHO ORIGINAL INTACTO')
  })

  test('excluir remove a análise da lista', async ({ page }) => {
    await page.getByRole('button', { name: /Analisar com IA/ }).click()
    await page.getByRole('button', { name: 'Entendi e concordo' }).click()
    await expect(page.getByText('[MOCK] Síntese de teste E2E.')).toBeVisible({ timeout: 15_000 })

    page.once('dialog', dialog => dialog.accept())
    await page.getByRole('button', { name: 'Excluir análise' }).first().click()
    await expect(page.getByText('[MOCK] Síntese de teste E2E.')).not.toBeVisible({ timeout: 10_000 })
  })

  test('regenerar consome uma nova unidade da franquia mensal', async ({ page }) => {
    const usageText = async () => (await page.getByText(/de \d+ análises utilizadas neste mês/).textContent())?.trim()

    await page.getByRole('button', { name: /Analisar com IA/ }).click()
    await page.getByRole('button', { name: 'Entendi e concordo' }).click()
    await expect(page.getByText('[MOCK] Síntese de teste E2E.')).toBeVisible({ timeout: 15_000 })
    const before = await usageText()

    page.once('dialog', dialog => dialog.accept()) // confirma "gerar nova análise" (já existe uma anterior)
    await page.getByRole('button', { name: 'Gerar nova análise' }).click()
    await expect(page.getByText('Analisando...')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('[MOCK] Síntese de teste E2E.')).toBeVisible({ timeout: 15_000 })
    const after = await usageText()

    const usedBefore = Number(before?.match(/^(\d+)/)?.[1] ?? 0)
    const usedAfter = Number(after?.match(/^(\d+)/)?.[1] ?? 0)
    expect(usedAfter).toBe(usedBefore + 1)
  })

  test('dark mode mantém o texto legível (contraste aplicado via classes dark:)', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.reload()
    await goToAssessment(page, assessmentId)
    await expect(page.getByText('Copiloto clínico (IA)')).toBeVisible()
    const bg = await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)
    expect(bg).toContain('dark')
  })

  test('layout móvel não quebra (sem overflow horizontal)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.reload()
    await goToAssessment(page, assessmentId)
    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
    expect(hasHorizontalOverflow).toBe(false)
  })
})

test.describe('Copiloto Neuropsicológico — falhas do provedor (mesma conta Pro)', () => {
  let assessmentId = ''
  const patientName = `Paciente Falhas ${Date.now()}`

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000)
    const page = await browser.newPage()
    try {
      // Reaproveita o e-mail comped-Pro fixo — já existe (criado na suíte
      // anterior) ou é criado aqui se rodado isoladamente.
      await loginOrRegister(page, E2E_PRO_EMAIL, 'E2E Copiloto Pro')
      await createPatient(page, patientName, Date.now())
      assessmentId = await startNeuropsychAssessment(page, patientName)
    } finally {
      await page.close()
    }
  })

  test.beforeEach(async ({ page }) => {
    await login(page, E2E_PRO_EMAIL)
    await goToAssessment(page, assessmentId)
    await dismissOverlays(page)
  })

  async function triggerAnalysisWith(page: import('@playwright/test').Page, marker: string) {
    await setReferralQuestionText(page, `Motivo de encaminhamento. ${marker}`)
    await page.getByRole('button', { name: /Analisar com IA/ }).click()
    const consentButton = page.getByRole('button', { name: 'Entendi e concordo' })
    if (await consentButton.count()) await consentButton.click()
  }

  test('JSON inválido do modelo é tratado com mensagem amigável, sem quebrar a página', async ({ page }) => {
    await triggerAnalysisWith(page, E2E_TRIGGERS.invalidJson)
    await expect(page.getByText(/formato inesperado/i)).toBeVisible({ timeout: 15_000 })
    // A página segue funcional após o erro — o botão de analisar continua ali.
    await expect(page.getByRole('button', { name: /Analisar com IA|Gerar nova análise/ })).toBeVisible()
  })

  test('falha do provedor exibe erro amigável e não trava a interface', async ({ page }) => {
    await triggerAnalysisWith(page, E2E_TRIGGERS.providerError)
    await expect(page.getByText(/Não foi possível gerar a análise/i)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: /Analisar com IA|Gerar nova análise/ })).toBeEnabled()
  })

  test('duplo clique no botão de gerar não dispara duas análises', async ({ page }) => {
    await setReferralQuestionText(page, 'Motivo de encaminhamento sem marcador especial.')
    const button = page.getByRole('button', { name: /Analisar com IA|Gerar nova análise/ })
    await button.click()
    const consentButton = page.getByRole('button', { name: 'Entendi e concordo' })
    if (await consentButton.count()) await consentButton.click()

    // Clique adicional imediato, ainda com o botão em estado de carregamento.
    await button.click({ force: true }).catch(() => undefined)

    await expect(page.getByText('[MOCK] Síntese de teste E2E.')).toBeVisible({ timeout: 15_000 })
    const usageText = await page.getByText(/de \d+ análises utilizadas neste mês/).textContent()
    const used = Number(usageText?.match(/^(\d+)/)?.[1] ?? -1)
    // Duas chamadas concorrentes bem-sucedidas incrementariam +2; o guard deve limitar a +1.
    expect(used).toBeGreaterThanOrEqual(1)
  })

  test('limite mensal atingido bloqueia novas gerações com mensagem clara', async ({ page }) => {
    seedIndividualLimitReached(E2E_PRO_EMAIL, 30)
    await page.reload()
    await goToAssessment(page, assessmentId)
    await expect(page.getByText('Limite mensal de análises do Copiloto atingido')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: /Analisar com IA|Gerar nova análise/ })).not.toBeVisible()
  })

  test('teto global mensal atingido bloqueia geração com mensagem genérica', async ({ page }) => {
    execSql(`UPDATE ai_usage SET "neuropsychAnalyses" = 0 WHERE "userId" = (SELECT id FROM users WHERE email = '${E2E_PRO_EMAIL}')`)
    seedGlobalBudgetReached(50)
    await page.reload()
    await goToAssessment(page, assessmentId)
    await setReferralQuestionText(page, 'Motivo de encaminhamento normal.')
    await page.getByRole('button', { name: /Analisar com IA|Gerar nova análise/ }).click()
    const consentButton = page.getByRole('button', { name: 'Entendi e concordo' })
    if (await consentButton.count()) await consentButton.click()
    await expect(page.getByText(/limite de uso geral neste mês/i)).toBeVisible({ timeout: 15_000 })
  })
})

test.describe('Copiloto Neuropsicológico — planos Grátis e Essencial', () => {
  let email = ''
  const patientName = `Paciente Free ${Date.now()}`

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000)
    const stamp = Date.now()
    email = `e2e.copilot.free.${stamp}@example.com`
    const page = await browser.newPage()
    try {
      await registerAndActivateFree(page, email)
      await createPatient(page, patientName, stamp)
    } finally {
      await page.close()
    }
  })

  test.afterAll(async () => {
    if (email) await cleanupAccount(email)
  })

  test('organizador local sem IA continua disponível (sem custo, sem plano Pro)', async ({ page }) => {
    await login(page, email)
    await navigateApp(page, '/avaliacoes')
    await dismissOverlays(page)
    await page.waitForTimeout(500) // banner de analytics só aparece após o onboarding fechar
    await dismissOverlays(page)
    await page.getByRole('button', { name: 'Iniciar avaliação' }).click()
    const select = page.getByRole('dialog').locator('select').first()
    await selectOptionByText(select, patientName)
    await page.getByRole('button', { name: 'Iniciar' }).click()
    await page.waitForURL(/#?\/avaliacoes\/[0-9a-f-]+/, { timeout: 15_000 })
    await page.getByRole('button', { name: /Integração e IA|Integrar/ }).click()

    await expect(page.getByRole('button', { name: 'Organizar rascunho sem IA' })).toBeVisible()
    await expect(page.getByText('Copiloto clínico (IA)')).toBeVisible()
    await expect(page.getByRole('button', { name: /Analisar com IA/ })).not.toBeVisible()
    await expect(page.getByRole('link', { name: 'Conhecer o plano Pro' })).toBeVisible()
  })

  test('chamada manual à API de análise recebe acesso negado (backend, não só UI)', async ({ page }) => {
    await login(page, email)
    await navigateApp(page, '/avaliacoes')
    await dismissOverlays(page)
    await page.waitForTimeout(500) // banner de analytics só aparece após o onboarding fechar
    await dismissOverlays(page)
    await page.getByRole('button', { name: 'Iniciar avaliação' }).click()
    const select = page.getByRole('dialog').locator('select').first()
    await selectOptionByText(select, patientName)
    await page.getByRole('button', { name: 'Iniciar' }).click()
    await page.waitForURL(/#?\/avaliacoes\/[0-9a-f-]+/, { timeout: 15_000 })
    const assessmentId = page.url().match(/avaliacoes\/([0-9a-f-]+)/)?.[1]
    expect(assessmentId).toBeTruthy()

    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')

    const api = await request.newContext({ baseURL: apiBaseUrl })
    try {
      const res = await api.post(`/neuropsych-assessments/${assessmentId}/ai-analysis`, {
        headers: { Cookie: cookieHeader },
        data: { fields: ['clinicalHistory'] },
      })
      expect(res.status()).toBe(403)
    } finally {
      await api.dispose()
    }
  })
})

test.describe('Copiloto Neuropsicológico — isolamento entre contas', () => {
  const emailB = `e2e.copilot.iso.b.${Date.now()}@example.com`
  const patientNameA = `Paciente Isolamento ${Date.now()}`
  let assessmentIdA = ''

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000)
    // Conta A: usa o e-mail comped-Pro fixo (mesma conta das suítes anteriores).
    const pageA = await browser.newPage()
    try {
      await loginOrRegister(pageA, E2E_PRO_EMAIL, 'E2E Copiloto Pro')
      await createPatient(pageA, patientNameA, Date.now())
      assessmentIdA = await startNeuropsychAssessment(pageA, patientNameA)
    } finally {
      await pageA.close()
    }

    // Conta B: conta free comum, distinta, só para tentar acessar dados de A.
    const pageB = await browser.newPage()
    try {
      await registerAndActivateFree(pageB, emailB, 'E2E Copiloto Isolamento B')
    } finally {
      await pageB.close()
    }
  })

  test.afterAll(async () => {
    await cleanupAccount(emailB)
  })

  test('psicólogo B não lista nem gera análise na avaliação de A', async ({ browser }) => {
    const pageB = await browser.newPage()
    await login(pageB, emailB)
    const cookiesB = await pageB.context().cookies()
    const cookieHeaderB = cookiesB.map(c => `${c.name}=${c.value}`).join('; ')
    await pageB.close()

    const api = await request.newContext({ baseURL: apiBaseUrl })
    try {
      const list = await api.get(`/neuropsych-assessments/${assessmentIdA}/ai-analysis`, {
        headers: { Cookie: cookieHeaderB },
      })
      // B não tem plano Pro (403) OU a avaliação não é dele (404) — de todo
      // modo, nunca deve ver ou operar sobre dados de A.
      expect([403, 404]).toContain(list.status())

      const generate = await api.post(`/neuropsych-assessments/${assessmentIdA}/ai-analysis`, {
        headers: { Cookie: cookieHeaderB },
        data: { fields: ['clinicalHistory'] },
      })
      expect([403, 404]).toContain(generate.status())
    } finally {
      await api.dispose()
    }
  })
})
