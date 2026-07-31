import { ForbiddenException } from '@nestjs/common'
import { AiTextQuotaService } from './ai-text-quota.service'

function usageRepository(updateAffected = 1, summaryRequests = 1) {
  let operation = ''
  const builder: any = {}
  builder.insert = jest.fn(() => { operation = 'insert'; return builder })
  builder.update = jest.fn(() => { operation = 'update'; return builder })
  builder.values = jest.fn(() => builder)
  builder.orIgnore = jest.fn(() => builder)
  builder.set = jest.fn(() => builder)
  builder.where = jest.fn(() => builder)
  builder.execute = jest.fn(async () => operation === 'update' ? { affected: updateAffected } : {})

  return {
    repository: {
      createQueryBuilder: jest.fn(() => builder),
      findOne: jest.fn(async () => ({ summaryRequests })),
    } as any,
    builder,
  }
}

describe('AiTextQuotaService', () => {
  it('bloqueia conta sem plano antes de reservar uma chamada', async () => {
    const usage = usageRepository()
    const planAccess = { getCurrentPlan: jest.fn().mockResolvedValue('free') } as any
    const service = new AiTextQuotaService(usage.repository, planAccess)

    await expect(service.reserve('user-free', 'free@example.com')).rejects.toBeInstanceOf(ForbiddenException)
    expect(usage.repository.createQueryBuilder).not.toHaveBeenCalled()
  })

  it('reserva a franquia de forma atômica para o plano Pro', async () => {
    const usage = usageRepository(1, 7)
    const planAccess = { getCurrentPlan: jest.fn().mockResolvedValue('pro') } as any
    const service = new AiTextQuotaService(usage.repository, planAccess)

    await expect(service.reserve('user-1', 'psi@example.com')).resolves.toEqual({
      used: 7,
      limit: 150,
      plan: 'pro',
    })
    expect(usage.builder.where).toHaveBeenCalledWith(
      '"userId" = :userId AND month = :month AND "summaryRequests" < :limit',
      expect.objectContaining({ userId: 'user-1', limit: 150 }),
    )
  })

  it('recusa a chamada quando a atualização atômica não encontra franquia', async () => {
    const usage = usageRepository(0, 150)
    const planAccess = { getCurrentPlan: jest.fn().mockResolvedValue('pro') } as any
    const service = new AiTextQuotaService(usage.repository, planAccess)

    await expect(service.reserve('user-1', 'psi@example.com')).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('devolve uma reserva quando o provedor falha', async () => {
    const usage = usageRepository()
    const service = new AiTextQuotaService(usage.repository, {} as any)

    await service.release('user-1')
    expect(usage.builder.set).toHaveBeenCalledWith({
      summaryRequests: expect.any(Function),
    })
    const expression = usage.builder.set.mock.calls[0][0].summaryRequests()
    expect(expression).toContain('GREATEST')
  })
})
