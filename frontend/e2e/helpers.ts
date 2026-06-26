import { request, type Locator, type Page } from '@playwright/test'

export const apiBaseUrl = process.env.E2E_API_URL ?? 'https://psicosaas-production-2d6c.up.railway.app/api'
export const appBaseUrl = process.env.E2E_BASE_URL ?? 'https://usecognia.com.br'
export const testPassword = process.env.E2E_TEST_PASSWORD ?? 'Teste@12345'

export function appPath(path: string) {
  return `${appBaseUrl.replace(/\/$/, '')}/#${path}`
}

export async function navigateApp(page: Page, path: string) {
  await page.goto(appPath(path))
  await page.waitForURL(new RegExp(`#${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[?&])`), {
    timeout: 15_000,
  }).catch(async () => {
    await page.evaluate((targetPath) => {
      window.location.hash = targetPath
    }, path)
    await page.waitForURL(new RegExp(`#${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[?&])`), {
      timeout: 15_000,
    })
  })
}

export async function selectOptionByText(selectLocator: Locator, text: string) {
  await selectLocator.waitFor({ state: 'visible', timeout: 15_000 })
  const value = await selectLocator.evaluate((select, optionText) => {
    const options = Array.from((select as HTMLSelectElement).options)
    return options.find(option => option.textContent?.includes(optionText))?.value ?? ''
  }, text)
  if (!value) throw new Error(`Option containing "${text}" not found`)
  await selectLocator.selectOption(value)
}

export async function selectMobileAgendaDate(page: Page, date: Date) {
  const viewport = page.viewportSize()
  if (!viewport || viewport.width >= 1024) return

  const day = String(date.getDate())
  await page.getByRole('button', { name: new RegExp(`\\b${day}\\b`) }).first().click({ timeout: 10_000 })
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
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await Promise.race([
    page.waitForURL(url => !url.pathname.endsWith('/login'), { timeout: 15_000 }).catch(() => undefined),
    page.getByText(/e-mail ou senha incorretos|não foi possível entrar/i).waitFor({ timeout: 15_000 }).catch(() => undefined),
  ])
  if (new URL(page.url()).pathname.endsWith('/login')) return
  await page.getByRole('link', { name: 'Pacientes' }).waitFor({ timeout: 15_000 }).catch(() => undefined)
}

export async function logout(page: Page) {
  // Menu do usuário → Sair
  const userMenu = page.getByRole('button', { name: /menu do usuário|minha conta/i })
  if (await userMenu.count()) {
    await userMenu.click()
    await page.getByRole('menuitem', { name: 'Sair' }).click()
    return
  }

  await page.getByRole('button', { name: 'Abrir perfil' }).click()
  await page.getByRole('button', { name: 'Sair da conta' }).click({ timeout: 15_000 })
}

export async function cleanupAccount(email: string) {
  const api = await request.newContext({ baseURL: apiBaseUrl })
  try {
    const login = await api.post('/auth/login', { data: { email, password: testPassword } })
    if (!login.ok()) {
      console.warn(`[cleanup] login falhou para ${email}: HTTP ${login.status()} — globalTeardown irá limpar`)
      return
    }
    const { csrfToken } = await login.json()
    if (!csrfToken) {
      console.warn(`[cleanup] csrfToken ausente para ${email} — globalTeardown irá limpar`)
      return
    }
    const del = await api.delete('/auth/account', {
      headers: { 'X-CSRF-Token': csrfToken },
      data: { password: testPassword, confirmation: 'EXCLUIR' },
    })
    if (!del.ok()) {
      console.warn(`[cleanup] DELETE /auth/account falhou para ${email}: HTTP ${del.status()} ${await del.text()}`)
    }
  } finally {
    await api.dispose()
  }
}

export async function createPatient(page: Page, name: string, stamp: number) {
  await navigateApp(page, '/pacientes')
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
