import { expect, test } from '@playwright/test'
import {
  appPath,
  cleanupAccount,
  createPatient,
  dismissOverlays,
  login,
  registerAndActivateFree,
} from './helpers'

test.describe('Prontuário', () => {
  let email = ''
  let patientName = ''
  const clinicalNote = 'Evolução clínica E2E — nota pública.'
  const privateNote = 'Nota privada E2E — não deve aparecer no timeline.'
  const nextStep = 'Próximo passo E2E.'

  test.beforeAll(async ({ browser }) => {
    const stamp = Date.now()
    email = `e2e.prontuario.${stamp}@example.com`
    patientName = `Paciente Prontuario ${stamp}`
    const page = await browser.newPage()
    try {
      await registerAndActivateFree(page, email)
      await createPatient(page, patientName, stamp)

      // Registra uma sessão
      await page.goto(appPath('/sessoes'))
      const btn = page.getByRole('button', { name: /registrar primeira sessão|nova sessão|como foi/i })
      await btn.first().click({ timeout: 10_000 })

      const dialog = page.getByRole('dialog')
      const patientSelect = dialog.locator('select').first()
      await patientSelect.selectOption({ label: new RegExp(patientName.split(' ')[0]) }).catch(async () => {
        await dialog.getByText(patientName.split(' ')[0]).click()
      })

      await page.getByPlaceholder(/trabalhado|evolução|pontos de atenção/i).fill(clinicalNote)
      await page.getByPlaceholder(/privada|reflexões|hipóteses/i).fill(privateNote)
      await page.getByPlaceholder(/próximo|tarefas/i).fill(nextStep)
      await page.getByRole('button', { name: 'Salvar sessão' }).click()
      await page.getByText('Evolução registrada').waitFor({ timeout: 10_000 })
    } finally {
      await page.close()
    }
  })

  test.afterAll(async () => {
    if (email) await cleanupAccount(email)
  })

  test('sessão registrada aparece na ficha do paciente', async ({ page }) => {
    await login(page, email)
    await page.goto(appPath('/pacientes'))
    await dismissOverlays(page)

    await page.getByRole('link', { name: new RegExp(patientName.split(' ')[0]) }).first().click()
    await expect(page.getByText(clinicalNote)).toBeVisible({ timeout: 10_000 })
  })

  test('nota privada não aparece no timeline público', async ({ page }) => {
    await login(page, email)
    await page.goto(appPath('/pacientes'))
    await page.getByRole('link', { name: new RegExp(patientName.split(' ')[0]) }).first().click()

    // A nota privada NÃO deve ser visível na aba de timeline/evolução pública
    await expect(page.getByText(privateNote)).not.toBeVisible({ timeout: 5_000 })
  })

  test('próximo passo aparece na sessão', async ({ page }) => {
    await login(page, email)
    await page.goto(appPath('/sessoes'))
    await dismissOverlays(page)
    await expect(page.getByText(patientName.split(' ')[0]).first()).toBeVisible({ timeout: 10_000 })
  })

  test('ficha do paciente mostra contador de sessões', async ({ page }) => {
    await login(page, email)
    await page.goto(appPath('/pacientes'))
    await page.getByRole('link', { name: new RegExp(patientName.split(' ')[0]) }).first().click()
    await expect(page.getByText(/1 sessão|1 evolução/i)).toBeVisible({ timeout: 10_000 })
  })
})
