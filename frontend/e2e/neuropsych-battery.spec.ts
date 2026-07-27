import { expect, test } from '@playwright/test'
import {
  cleanupAccount,
  createPatient,
  dismissOverlays,
  navigateApp,
  registerAndActivateFree,
  selectOptionByText,
} from './helpers'

test.describe('Bateria neuropsicológica', () => {
  let email = ''

  test.afterEach(async () => {
    if (email) await cleanupAccount(email)
  })

  test('adiciona um procedimento com o payload aceito pelo backend', async ({ page }) => {
    const stamp = Date.now()
    email = `e2e.neuro.battery.${stamp}@example.com`
    const patientName = `Paciente Neuro ${stamp}`
    const procedureName = `Teste Mínimo ${stamp}`

    await registerAndActivateFree(page, email, 'Teste Neuro UseCognia')
    await createPatient(page, patientName, stamp)
    await navigateApp(page, '/avaliacoes')
    await dismissOverlays(page)

    await page.getByRole('button', { name: 'Iniciar avaliação' }).click()
    const dialog = page.getByRole('dialog')
    await selectOptionByText(dialog.locator('select'), patientName)
    await dialog.getByRole('button', { name: 'Iniciar' }).click()
    await page.waitForURL(/\/avaliacoes\/[0-9a-f-]+/, { timeout: 15_000 })

    await page.getByRole('button', { name: /Bateria/ }).click()
    await page.getByPlaceholder('Nome do procedimento').fill(procedureName)
    await page.getByRole('button', { name: 'Adicionar à bateria' }).click()

    await expect(page.getByRole('heading', { name: procedureName })).toBeVisible()
  })
})
