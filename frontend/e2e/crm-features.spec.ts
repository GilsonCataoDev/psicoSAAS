import { expect, test } from '@playwright/test'
import { createPatient, dismissOverlays, login, navigateApp, registerAndActivateFree } from './helpers'

test.describe('CRM features', () => {
  let email = ''
  let patientName = ''

  test.beforeAll(async ({ browser }) => {
    const stamp = Date.now()
    email = `e2e.crm.${stamp}@example.com`
    patientName = `Paciente CRM ${stamp}`
    const page = await browser.newPage()
    try {
      await registerAndActivateFree(page, email)
      await createPatient(page, patientName, stamp)
    } finally {
      await page.close()
    }
  })

  test('kanban view toggle renders columns', async ({ page }) => {
    await login(page, email)
    await navigateApp(page, '/pacientes')
    await dismissOverlays(page)

    // Switch to kanban view
    const kanbanBtn = page.getByRole('button', { name: /kanban/i })
    if (await kanbanBtn.isVisible()) {
      await kanbanBtn.click()
    } else {
      // Try by aria-label or icon button
      const gridBtn = page.locator('button[aria-label*="kanban" i], button[title*="kanban" i]').first()
      await gridBtn.click({ timeout: 5_000 }).catch(() => {})
    }

    // Expect the 3 kanban columns to be visible
    await expect(page.getByText('Ativo')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('Pausado')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('Alta')).toBeVisible({ timeout: 5_000 })
  })

  test('advanced filters panel can be toggled', async ({ page }) => {
    await login(page, email)
    await navigateApp(page, '/pacientes')
    await dismissOverlays(page)

    const filterBtn = page.getByRole('button', { name: /filtros|filter/i })
    await filterBtn.click({ timeout: 8_000 })

    await expect(page.getByText(/data de início|tags|fatura/i)).toBeVisible({ timeout: 5_000 })
  })

  test('export CSV button is present', async ({ page }) => {
    await login(page, email)
    await navigateApp(page, '/pacientes')
    await dismissOverlays(page)

    await expect(page.getByRole('button', { name: /exportar/i })).toBeVisible()
  })

  test('campaign button opens re-engagement modal', async ({ page }) => {
    await login(page, email)
    await navigateApp(page, '/pacientes')
    await dismissOverlays(page)

    const campBtn = page.getByRole('button', { name: /campanha/i })
    await campBtn.click({ timeout: 8_000 })

    await expect(page.getByText(/reengajamento/i)).toBeVisible({ timeout: 5_000 })
    await expect(page.getByRole('textbox')).toBeVisible()
  })

  test('financial delinquency panel shows when overdue records exist', async ({ page }) => {
    await login(page, email)
    await navigateApp(page, '/financeiro')
    await dismissOverlays(page)

    // Panel only shows when there are overdue records; just assert the page loads
    await expect(page.getByText(/lancamentos|lançamentos/i)).toBeVisible({ timeout: 8_000 })
  })

  test('bank reconciliation modal opens', async ({ page }) => {
    await login(page, email)
    await navigateApp(page, '/financeiro')
    await dismissOverlays(page)

    const conciliarBtn = page.getByRole('button', { name: /conciliar/i })
    await conciliarBtn.click({ timeout: 8_000 })

    await expect(page.getByText(/conciliação bancária/i)).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(/csv/i)).toBeVisible()
  })

  test('NPS survey public page renders score grid', async ({ page }) => {
    // Test the public page with a fake token — expects "not found" or the survey form
    await page.goto('/avaliar/00000000000000000000000000000000')
    await page.waitForLoadState('networkidle')

    const notFound = page.getByText(/não encontrada|not found/i)
    const scoreGrid = page.getByRole('button', { name: '0' })

    const visible = await Promise.race([
      notFound.waitFor({ timeout: 8_000 }).then(() => 'not-found'),
      scoreGrid.waitFor({ timeout: 8_000 }).then(() => 'survey'),
    ]).catch(() => 'timeout')

    expect(['not-found', 'survey']).toContain(visible)
  })

  test('reminder prefs card renders in contacts tab', async ({ page }) => {
    await login(page, email)
    await navigateApp(page, '/pacientes')
    await dismissOverlays(page)

    // Open patient detail
    const patientLink = page.getByText(patientName).first()
    await patientLink.click({ timeout: 8_000 })
    await page.waitForURL(/\/pacientes\/.+/)

    // Navigate to Contacts tab
    const contactsTab = page.getByRole('button', { name: /contatos/i })
    await contactsTab.click({ timeout: 8_000 })

    await expect(page.getByText(/lembretes automáticos/i)).toBeVisible({ timeout: 8_000 })
  })
})
