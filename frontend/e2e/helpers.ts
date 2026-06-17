import { request, type Page } from '@playwright/test'

export const apiBaseUrl = process.env.E2E_API_URL ?? 'https://psicosaas-production-2d6c.up.railway.app/api'
export const appBaseUrl = process.env.E2E_BASE_URL ?? 'https://usecognia.com.br'
export const testPassword = process.env.E2E_TEST_PASSWORD ?? 'Teste@12345'

export function appPath(path: string) {
  return `${appBaseUrl.replace(/\/$/, '')}/#${path}`
}

export async function dismissOverlays(page: Page) {
  const btn = page.getByRole('button', { name: 'Fechar' })
  if (await btn.count()) await btn.first().click().catch(() => undefined)
}

export async function registerAndActivateFree(page: Page, email: string, name = 'Teste E2E') {
  await page.goto(appPath('/cadastro'))
  await page.getByPlaceholder('Nome completo').fill(name)
  await page.getByPlaceholder('seu@email.com').fill(email)
  await page.getByPlaceholder('06/123456').fill('06/123456')
  await page.getByPlaceholder('Mínimo 8 caracteres').fill(testPassword)
  await page.locator('#crpConfirmed').check()
  await page.locator('#terms').check()
  await page.getByRole('button', { name: 'Criar conta gratuita' }).click()
  await page.getByRole('button', { name: 'Comece gratis agora' }).click({ timeout: 15_000 })
  await page.getByText('Seu plano foi ativado').waitFor({ timeout: 15_000 })
  await dismissOverlays(page)
}

export async function login(page: Page, email: string, password = testPassword) {
  await page.goto(appPath('/login'))
  await page.getByPlaceholder('seu@email.com').fill(email)
  await page.getByPlaceholder('Mínimo 8 caracteres').fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

export async function logout(page: Page) {
  // Menu do usuário → Sair
  const userMenu = page.getByRole('button', { name: /menu do usuário|minha conta/i })
  if (await userMenu.count()) {
    await userMenu.click()
  } else {
    await page.getByRole('button', { name: 'Sair' }).click()
    return
  }
  await page.getByRole('menuitem', { name: 'Sair' }).click()
}

export async function cleanupAccount(email: string) {
  const api = await request.newContext({ baseURL: apiBaseUrl })
  try {
    const login = await api.post('/auth/login', { data: { email, password: testPassword } })
    if (!login.ok()) return
    const { csrfToken } = await login.json()
    if (!csrfToken) return
    await api.delete('/auth/account', {
      headers: { 'X-CSRF-Token': csrfToken },
      data: { password: testPassword, confirmation: 'EXCLUIR' },
    })
  } finally {
    await api.dispose()
  }
}

export async function createPatient(page: Page, name: string, stamp: number) {
  await page.goto(appPath('/pacientes'))
  const newBtn = page.getByRole('button', { name: 'Novo paciente' })
  if (await newBtn.count()) {
    await newBtn.click()
  } else {
    await page.getByRole('button', { name: 'Cadastrar primeiro paciente' }).click()
  }
  await page.getByPlaceholder('Nome completo').fill(name)
  await page.getByPlaceholder('email@exemplo.com').fill(`paciente.${stamp}@example.com`)
  await page.getByRole('button', { name: 'Salvar' }).click()
  await page.getByRole('link', { name: new RegExp(name) }).waitFor({ timeout: 10_000 })
}
