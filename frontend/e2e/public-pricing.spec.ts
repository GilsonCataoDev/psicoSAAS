import { expect, test } from '@playwright/test'

test.describe('Preços públicos', () => {
  test('visitante compara os planos e segue para o cadastro antes de contratar', async ({ page }) => {
    await page.goto('/precos')

    await expect(page).toHaveURL(/\/precos$/)
    await expect(page.getByRole('heading', { name: 'Escolha como quer usar o UseCognia' })).toBeVisible()

    await page.getByRole('button', { name: /Testar Pro por 14 dias/ }).click()
    await expect(page).toHaveURL(/\/cadastro\?plano=pro$/)
  })
})
