import { expect, request, test, type Page } from '@playwright/test'

const appBaseUrl = process.env.E2E_BASE_URL ?? 'https://usecognia.com.br'
const apiBaseUrl = process.env.E2E_API_URL ?? 'https://psicosaas-production-2d6c.up.railway.app/api'
const testPassword = process.env.E2E_TEST_PASSWORD ?? 'Teste@12345'

function appPath(path: string) {
  return `${appBaseUrl.replace(/\/$/, '')}/#${path}`
}

async function dismissOverlays(page: Page) {
  const maybeClose = page.getByRole('button', { name: 'Fechar' })
  if (await maybeClose.count()) {
    await maybeClose.first().click().catch(() => undefined)
  }
}

async function cleanupAccount(email: string) {
  const api = await request.newContext({ baseURL: apiBaseUrl })
  try {
    const login = await api.post('/auth/login', {
      data: { email, password: testPassword },
    })
    if (!login.ok()) return

    const auth = await login.json()
    const csrfToken = auth?.csrfToken
    if (!csrfToken) return

    await api.delete('/auth/account', {
      headers: { 'X-CSRF-Token': csrfToken },
      data: { password: testPassword, confirmation: 'EXCLUIR' },
    })
  } finally {
    await api.dispose()
  }
}

test.describe('UseCognia production smoke', () => {
  let email = ''

  test.afterEach(async () => {
    if (email && process.env.E2E_SKIP_CLEANUP !== 'true') {
      await cleanupAccount(email)
    }
  })

  test('creates a free account, patient, evolution and financial record', async ({ page }) => {
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

    await expect(page.getByText('Escolha um plano para continuar')).toBeVisible()
    await dismissOverlays(page)
    await page.getByRole('button', { name: 'Comece gratis agora' }).click()
    await expect(page.getByText('Seu plano foi ativado')).toBeVisible()

    await page.goto(appPath('/pacientes'))
    const newPatientButton = page.getByRole('button', { name: 'Novo paciente' })
    if (await newPatientButton.count()) {
      await newPatientButton.click()
    } else {
      await page.getByRole('button', { name: 'Cadastrar primeiro paciente' }).click()
    }
    await page.getByPlaceholder('Nome completo').fill(patientName)
    await page.getByPlaceholder('email@exemplo.com').fill(`paciente.${stamp}@example.com`)
    await page.getByPlaceholder('(11) 99999-9999').fill('(11) 99999-0000')
    await page.getByPlaceholder('Autodeclarada').first().fill('Parda')
    await page.getByPlaceholder('Autodeclarado').fill('Feminino')
    await page.getByPlaceholder('Autodeclarada').last().fill('Heterossexual')
    const patientDialog = page.getByRole('dialog', { name: 'Adicionar nova pessoa' })
    await patientDialog.locator('input[type="number"]').first().fill('180')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByRole('link', { name: new RegExp(patientName) })).toBeVisible()
    await expect(page.getByText('1/10 pacientes ativos no plano Grátis')).toBeVisible()

    await page.goto(appPath('/sessoes'))
    const firstSessionButton = page.getByRole('button', { name: 'Registrar primeira sessão' })
    await firstSessionButton.click({ timeout: 10_000 }).catch(async () => {
      await page.getByRole('button', { name: 'Como foi a sessão?' }).click()
    })

    const sessionDialog = page.getByRole('dialog', { name: 'Como foi a sessão?' })
    await sessionDialog.locator('select').first().selectOption({ label: patientName })
    await page.getByPlaceholder('O que foi trabalhado, pontos de atenção, avanços observados...').fill('Evolução automatizada do teste E2E.')
    await page.getByPlaceholder('Percepções, hipóteses de trabalho, reflexões clínicas...').fill('Nota privada do teste E2E.')
    await page.getByPlaceholder('Tarefas, temas para a próxima sessão...').fill('Próximo passo do teste E2E.')
    await page.getByRole('button', { name: 'Salvar sessão' }).click()

    await expect(page.getByText(patientName).first()).toBeVisible()
    await expect(page.getByText('Evolução registrada')).toBeVisible()
    await expect(page.getByText('Evolução automatizada do teste E2E.')).not.toBeVisible()

    await page.goto(appPath('/financeiro'))
    await expect(page.getByText('R$ 180').first()).toBeVisible()

    await page.goto(appPath('/'))
    await expect(page.getByText(patientName).first()).toBeVisible()
    await expect(page.getByText('Evolução registrada')).toBeVisible()
  })
})
