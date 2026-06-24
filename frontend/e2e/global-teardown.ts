import { request } from '@playwright/test'

const apiBaseUrl = process.env.E2E_API_URL ?? 'https://psicosaas-production-2d6c.up.railway.app/api'
const cleanupSecret = process.env.E2E_CLEANUP_SECRET

export default async function globalTeardown() {
  if (!cleanupSecret) {
    console.warn('[teardown] E2E_CLEANUP_SECRET ausente — pulando limpeza em massa')
    return
  }

  const api = await request.newContext({ baseURL: apiBaseUrl })
  try {
    const res = await api.post('/internal/cleanup-test-users', {
      headers: { 'X-Internal-Secret': cleanupSecret },
    })
    if (!res.ok()) {
      console.error(`[teardown] cleanup falhou: HTTP ${res.status()} ${await res.text()}`)
      return
    }
    const body = await res.json()
    console.log(`[teardown] usuários de teste removidos: ${body.deleted}`)
  } finally {
    await api.dispose()
  }
}
