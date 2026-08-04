import { expect, request, test } from '@playwright/test'

const appBaseUrl = (process.env.E2E_BASE_URL || 'https://usecognia.com.br').replace(/\/$/, '')
const configuredApiUrl = (process.env.E2E_API_URL || 'https://psicosaas-production-2d6c.up.railway.app/api').replace(/\/$/, '')
const apiBaseUrl = `${configuredApiUrl.endsWith('/api') ? configuredApiUrl : `${configuredApiUrl}/api`}/`
const testPassword = process.env.E2E_TEST_PASSWORD || 'Teste@12345'

function appPath(path: string) {
  return `${appBaseUrl}${path.startsWith('/') ? path : `/${path}`}`
}

async function cleanupAccount(email: string) {
  const api = await request.newContext({ baseURL: apiBaseUrl })
  try {
    const login = await api.post('auth/login', { data: { email, password: testPassword } })
    expect(login.ok(), `não foi possível autenticar a conta E2E ${email} para limpeza`).toBe(true)

    const { csrfToken } = await login.json()
    expect(csrfToken, `login da conta E2E ${email} não retornou CSRF token`).toBeTruthy()

    const deletion = await api.delete('auth/account', {
      headers: { 'X-CSRF-Token': csrfToken },
      data: { password: testPassword, confirmation: 'EXCLUIR' },
    })
    expect(deletion.ok(), `não foi possível excluir a conta E2E ${email}`).toBe(true)
  } finally {
    await api.dispose()
  }
}

async function dismissFirstAccessOverlays(
  page: import('@playwright/test').Page,
  options: { waitForTour?: boolean } = {},
) {
  const tourClose = page.getByTestId('onboarding-tour-close').or(
    page.locator('div.pointer-events-none.fixed button').filter({ hasText: 'Fechar' }),
  )
  if (options.waitForTour) {
    await tourClose.first().waitFor({ state: 'visible', timeout: 10_000 })
  }

  for (let attempt = 0; attempt < 6; attempt += 1) {
    let dismissed = false
    if (await tourClose.count()) {
      dismissed = await tourClose.first().click({ force: true }).then(async () => {
        await tourClose.first().waitFor({ state: 'detached', timeout: 10_000 })
        return true
      }).catch(() => false)
    }
    // 'Fechar' fecha a oferta de upgrade Pro (FreeUpgradeOfferModal) — sem
    // isso, a oferta pode renderizar entre navegações e bloquear cliques em
    // botoes por baixo dela (a busca da oferta é assíncrona, então o quanto
    // isso aparece varia por corrida entre a query e o clique do teste).
    for (const name of ['Fechar onboarding', 'Não, obrigado', 'Fechar']) {
      const button = page.getByRole('button', { name, exact: true }).filter({ visible: true })
      if (await button.count()) {
        dismissed = await button.first().click({ timeout: 1_500 }).then(() => true).catch(() => false) || dismissed
      }
    }
    if (!dismissed) return
    await page.waitForTimeout(250)
  }
}

test.describe('UseCognia production smoke', () => {
  let email = ''
  let accountCreated = false

  test.afterEach(async () => {
    if (email && accountCreated) await cleanupAccount(email)
    email = ''
    accountCreated = false
  })

  test('API, banco e páginas públicas essenciais estão disponíveis', async ({ page }) => {
    const api = await request.newContext({ baseURL: apiBaseUrl })
    try {
      const health = await api.get('health')
      expect(health.status()).toBe(200)
      expect(await health.json()).toMatchObject({
        status: 'ok',
        service: 'usecognia-api',
        checks: { database: 'ok' },
      })
    } finally {
      await api.dispose()
    }

    await page.goto(appPath('/'))
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    await page.goto(appPath('/precos'))
    await expect(page.getByRole('heading', { name: 'Escolha como quer usar o UseCognia' })).toBeVisible()

    await page.goto(appPath('/dpa'))
    await expect(page.getByRole('heading', { name: 'Acordo de Tratamento de Dados' })).toBeVisible()
  })

  test('cadastro gratuito cria conta e permite cadastrar paciente', async ({ page }) => {
    const stamp = Date.now()
    email = `e2e.smoke.${stamp}@example.com`
    const patientName = `Paciente Smoke ${stamp}`

    await page.goto(appPath('/cadastro'))
    await page.getByPlaceholder('Nome completo').fill('Teste Smoke UseCognia')
    await page.getByPlaceholder('seu@email.com').fill(email)
    await page.getByPlaceholder('(00) 00000-0000').fill('11987654321')
    await page.getByPlaceholder('06/123456').fill('06/123456')
    await page.getByPlaceholder('Mínimo 8 caracteres').fill(testPassword)
    await page.locator('#crpConfirmed').check()
    await page.locator('#terms').check()
    await page.getByRole('button', { name: 'Criar conta gratuita' }).click()

    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 })
    accountCreated = true
    await dismissFirstAccessOverlays(page, { waitForTour: true })

    await page.goto(appPath('/pacientes'))
    await dismissFirstAccessOverlays(page)

    const newPatient = page.getByRole('button', { name: 'Novo paciente' })
    if (await newPatient.count()) {
      await newPatient.click()
    } else {
      await page.getByRole('button', { name: 'Cadastrar primeiro paciente' }).click()
    }

    const patientDialog = page.getByRole('dialog', { name: 'Adicionar nova pessoa' })
    await expect(patientDialog).toBeVisible()
    await patientDialog.getByPlaceholder('Nome completo').fill(patientName)
    await patientDialog.getByPlaceholder('email@exemplo.com').fill(`paciente.${stamp}@example.com`)
    await patientDialog.getByRole('button', { name: 'Salvar' }).click()

    await expect(page.getByRole('link', { name: new RegExp(patientName) })).toBeVisible()
    await expect(page.getByText(/1\/10 pacientes ativos no plano Grátis/)).toBeVisible()
  })
})
