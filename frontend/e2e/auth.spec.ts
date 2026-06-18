import { expect, test } from '@playwright/test'
import {
  appPath,
  cleanupAccount,
  dismissOverlays,
  login,
  navigateApp,
  logout,
  registerAndActivateFree,
  testPassword,
} from './helpers'

test.describe('Auth', () => {
  let email = ''

  test.beforeAll(async ({ browser }) => {
    const stamp = Date.now()
    email = `e2e.auth.${stamp}@example.com`
    const page = await browser.newPage()
    try {
      await registerAndActivateFree(page, email)
    } finally {
      await page.close()
    }
  })

  test.afterAll(async () => {
    if (email) await cleanupAccount(email)
  })

  test('login com credenciais válidas redireciona para dashboard', async ({ page }) => {
    await login(page, email)
    await expect(page).toHaveURL(new RegExp('#/'), { timeout: 15_000 })
    await expect(page.getByText('Bom dia')).toBeVisible({ timeout: 10_000 }).catch(() =>
      expect(page.getByText('Boa tarde')).toBeVisible(),
    )
  })

  test('login com senha errada exibe mensagem de erro', async ({ page }) => {
    await login(page, email, 'SenhaErrada@999')
    await expect(
      page.getByText(/credenciais inválidas|senha incorreta|e-mail ou senha/i),
    ).toBeVisible({ timeout: 10_000 })
  })

  test('logout redireciona para login', async ({ page }) => {
    await login(page, email)
    await page.getByText('Bom dia').waitFor({ timeout: 15_000 }).catch(() =>
      page.getByText('Boa tarde').waitFor({ timeout: 5_000 }),
    )
    await dismissOverlays(page)
    await logout(page)
    await expect(page).toHaveURL(new RegExp('#/login'), { timeout: 10_000 })
  })

  test('rota protegida sem login redireciona para login', async ({ page }) => {
    await page.goto(appPath('/pacientes'))
    await expect(page).toHaveURL(new RegExp('#/login'), { timeout: 10_000 })
  })
})

test.describe('Plano — gating de features', () => {
  let email = ''

  test.beforeAll(async ({ browser }) => {
    const stamp = Date.now()
    email = `e2e.plano.${stamp}@example.com`
    const page = await browser.newPage()
    try {
      await registerAndActivateFree(page, email)
    } finally {
      await page.close()
    }
  })

  test.afterAll(async () => {
    if (email) await cleanupAccount(email)
  })

  test('plano free exibe contador de pacientes', async ({ page }) => {
    await login(page, email)
    await navigateApp(page, '/pacientes')
    await expect(page.getByText(/0\/10 pacientes|pacientes no plano grátis/i)).toBeVisible({
      timeout: 10_000,
    })
  })

  test('aba WhatsApp não exibe botão de conectar para plano free', async ({ page }) => {
    await login(page, email)
    await navigateApp(page, '/configuracoes?tab=messages')
    await dismissOverlays(page)
    await expect(page.getByRole('button', { name: 'Conectar WhatsApp' })).not.toBeVisible({
      timeout: 8_000,
    })
  })

  test('transcrição por voz não aparece para plano free', async ({ page }) => {
    await login(page, email)
    await navigateApp(page, '/sessoes')
    await page.getByRole('button', { name: /registrar|nova sessão/i }).first().click({
      timeout: 10_000,
    }).catch(() => undefined)
    await expect(page.getByRole('button', { name: /ditar|transcrever/i })).not.toBeVisible({
      timeout: 8_000,
    })
  })
})
