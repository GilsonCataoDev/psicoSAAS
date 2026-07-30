import { expect, test } from '@playwright/test'

test.describe('SEO por rota', () => {
  test('servidor de artefatos rejeita URL malformada sem encerrar', async ({ request }) => {
    const malformed = await request.get('/%E0%A4%A')
    expect(malformed.status()).toBe(404)

    const healthy = await request.get('/precos')
    expect(healthy.ok()).toBe(true)
  })

  test('preços possui metadados próprios no HTML inicial e no navegador', async ({ page, request }) => {
    const rawPath = process.env.E2E_BASE_URL?.includes('127.0.0.1')
      ? '/precos/index.html'
      : '/precos'
    const response = await request.get(rawPath)
    expect(response.ok()).toBe(true)
    const html = await response.text()
    expect(html).toContain('<title>Preços e planos para psicólogos | UseCognia</title>')
    expect(html).toContain('<link rel="canonical" href="https://usecognia.com.br/precos" />')

    await page.goto('/precos')

    await expect(page).toHaveTitle('Preços e planos para psicólogos | UseCognia')
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      /Compare os planos do UseCognia/,
    )
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://usecognia.com.br/precos',
    )
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      'content',
      'https://usecognia.com.br/precos',
    )
  })

  test('autenticação não é indexada', async ({ page }) => {
    await page.goto('/login')

    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    )
  })
})
