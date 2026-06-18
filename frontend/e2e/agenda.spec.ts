import { expect, test } from '@playwright/test'
import {
  cleanupAccount,
  createPatient,
  dismissOverlays,
  login,
  navigateApp,
  registerAndActivateFree,
  selectMobileAgendaDate,
  selectOptionByText,
} from './helpers'

test.describe('Agenda', () => {
  let email = ''
  let patientName = ''

  test.beforeAll(async ({ browser }) => {
    const stamp = Date.now()
    email = `e2e.agenda.${stamp}@example.com`
    patientName = `Paciente Agenda ${stamp}`
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

  test('cria agendamento e aparece na lista da agenda', async ({ page }) => {
    await login(page, email)
    await navigateApp(page, '/agenda')
    await dismissOverlays(page)

    const newBtn = page.getByRole('button', { name: /novo agendamento|agendar/i })
    await newBtn.first().click({ timeout: 10_000 })

    const dialog = page.getByRole('dialog')
    await selectOptionByText(dialog.locator('select').first(), patientName)

    // Define data para amanhã
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = tomorrow.toISOString().slice(0, 10)
    const dateInput = dialog.locator('input[type="date"]')
    if (await dateInput.count()) {
      await dateInput.fill(dateStr)
    }

    const timeInput = dialog.locator('input[type="time"]')
    if (await timeInput.count()) {
      await timeInput.fill('10:00')
    }

    await dialog.getByRole('button', { name: /salvar|agendar|confirmar/i }).click()
    await selectMobileAgendaDate(page, tomorrow)
    await expect(page.getByText(patientName.split(' ')[0]).first()).toBeVisible({ timeout: 10_000 })
  })

  test('agendamento aparece no dashboard como próxima consulta', async ({ page }) => {
    await login(page, email)
    await navigateApp(page, '/')
    await dismissOverlays(page)
    await expect(page.getByText(patientName.split(' ')[0]).first()).toBeVisible({ timeout: 10_000 })
  })

  test('cancela agendamento', async ({ page }) => {
    await login(page, email)
    await navigateApp(page, '/agenda')
    await dismissOverlays(page)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    await selectMobileAgendaDate(page, tomorrow)

    const appointment = page.getByText(patientName.split(' ')[0]).first()
    await appointment.click({ timeout: 10_000 })

    const cancelBtn = page.getByRole('button', { name: /cancelar/i })
    if (await cancelBtn.count()) {
      await cancelBtn.first().click()
      const confirmBtn = page.getByRole('button', { name: /confirmar|sim/i })
      if (await confirmBtn.count()) await confirmBtn.click()
      await expect(page.getByText(/cancelado/i)).toBeVisible({ timeout: 10_000 })
    }
  })
})
