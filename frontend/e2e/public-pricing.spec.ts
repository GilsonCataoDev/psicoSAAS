import { expect, test } from '@playwright/test'

test.describe('Preços públicos', () => {
  test('visitante compara os planos e segue para o cadastro antes de contratar', async ({ page }) => {
    await page.goto('/precos')

    await expect(page).toHaveURL(/\/precos$/)
    await expect(page.getByRole('heading', { name: 'Experimente o UseCognia por 7 dias grátis' })).toBeVisible()

    await page.getByRole('button', { name: /Ativar 7 dias grátis/ }).click()
    await expect(page).toHaveURL(/\/cadastro\?plano=pro$/)
  })
})
