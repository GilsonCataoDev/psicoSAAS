import { expect, test } from '@playwright/test'

test('DPA público descreve papéis, suboperadores e resposta a incidentes', async ({ page }) => {
  await page.goto('/dpa')

  await expect(page.getByRole('heading', { name: 'Acordo de Tratamento de Dados' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Papéis das partes' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Suboperadores e transferências internacionais' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Incidentes de segurança' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Controles de segurança do UseCognia' })).toHaveAttribute('href', '/seguranca')
  await expect(page.getByRole('link', { name: 'Regulamento de incidentes da ANPD' })).toHaveAttribute(
    'href',
    'https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis',
  )
})
