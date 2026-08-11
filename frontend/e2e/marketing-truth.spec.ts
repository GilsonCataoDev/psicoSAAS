import { expect, test } from '@playwright/test'

test.describe('Promessas públicas verificáveis', () => {
  test('landing mantém a paleta pública legível mesmo com preferência de tema escuro', async ({ page }) => {
    await page.addInitScript(() => document.documentElement.classList.add('dark'))
    await page.goto('/')

    await expect(page.locator('html')).not.toHaveClass(/dark/)
    await expect(page.getByText('Por que agora', { exact: true })).toHaveCSS('color', 'rgb(36, 77, 61)')
  })

  test('landing descreve o público que consegue concluir o cadastro', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText('Gestão clínica para psicólogos com CRP ativo', { exact: true })).toBeVisible()
    await expect(page.locator('body')).not.toContainText(/terapeutas e estagiários|estagiários clínicos/i)
  })

  test('preços não anuncia cobrança ou garantias inexistentes', async ({ page }) => {
    await page.goto('/precos')

    const body = page.locator('body')
    await expect(body).not.toContainText(/cobrado por ano|plano anual|instrumentos do CFP/i)
    await expect(body).not.toContainText(/WhatsApp automático 100%|se paga em 3 atendimentos|suporte por WhatsApp/i)
    await expect(body).toContainText(
      'WhatsApp, pagamentos e IA dependem da configuração e disponibilidade dos respectivos provedores externos.',
    )
    await expect(body).toContainText(
      'A IA é um apoio opcional e pode ficar indisponível quando o provedor não estiver configurado.',
    )
  })
})
