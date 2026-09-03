import { HealthController } from '../health.controller'

describe('HealthController', () => {
  it('nunca inclui stack trace, mensagem de erro ou connection string no corpo, mesmo com o banco falhando', async () => {
    const ds = { query: jest.fn().mockRejectedValue(new Error('connection to postgresql://user:pass@host/db failed')) }
    const controller = new HealthController(ds as any)

    const result = await controller.check()

    expect(result.status).toBe('degraded')
    expect(result.checks.database).toBe('error')
    const serialized = JSON.stringify(result)
    expect(serialized).not.toMatch(/postgresql:\/\//)
    expect(serialized).not.toMatch(/password|pass@/i)
    expect(serialized).not.toContain('Error:')
  })

  it('retorna ok quando o banco responde normalmente', async () => {
    const ds = { query: jest.fn().mockResolvedValue([{ '?column?': 1 }]) }
    const controller = new HealthController(ds as any)

    const result = await controller.check()

    expect(result.status).toBe('ok')
    expect(result.checks.database).toBe('ok')
    expect(result.service).toBe('usecognia-api')
  })
})
