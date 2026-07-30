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

  test('respeita o plano e, quando liberado, adiciona um procedimento', async ({ page }) => {
    const stamp = Date.now()
    email = `e2e.neuro.battery.${stamp}@example.com`
    const patientName = `Paciente Neuro ${stamp}`
    const procedureName = `Teste Mínimo ${stamp}`

    await registerAndActivateFree(page, email, 'Teste Neuro UseCognia')
    await createPatient(page, patientName, stamp)
    await navigateApp(page, '/avaliacoes')
    await dismissOverlays(page)

    const startButton = page.getByRole('button', { name: 'Iniciar avaliação' })
    await Promise.race([
      startButton.waitFor({ state: 'visible', timeout: 15_000 }),
      page.waitForURL(/#\/planos(?:$|[?&])/, { timeout: 15_000 }),
    ])

    // O smoke de produção cria uma conta gratuita: nela, a proteção de plano
    // deve redirecionar para a oferta Pro. Em ambiente local com e-mail
    // compensado como Pro, o restante do teste valida o payload da bateria.
    if (page.url().includes('#/planos')) {
      await expect(page.getByText(/avaliações neuropsicológicas/i).first()).toBeVisible()
      return
    }

    await startButton.click()
    const dialog = page.getByRole('dialog')
    await selectOptionByText(dialog.locator('select'), patientName)
    await dialog.getByRole('button', { name: 'Iniciar' }).click()
    await page.waitForURL(/\/avaliacoes\/[0-9a-f-]+/, { timeout: 15_000 })

    await page.getByRole('button', { name: /Bateria/ }).click()
    await page.getByPlaceholder('Nome do procedimento').fill(procedureName)
    await page.getByRole('button', { name: 'Adicionar à bateria' }).click()

    await expect(page.getByRole('heading', { name: procedureName })).toBeVisible()

    await page.getByRole('combobox', { name: 'Status da avaliação' }).selectOption('in_progress')
    await expect(page.getByRole('status', { name: 'Salvamento automático do status' }))
      .toContainText('Status salvo automaticamente')
  })
})
