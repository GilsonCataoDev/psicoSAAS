import { SalesService } from './sales.service'
import { SalesCommission } from './entities/sales-commission.entity'

function repositoryMock() {
  return {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    find: jest.fn(),
    create: jest.fn((value: unknown) => value),
    save: jest.fn(async (value: unknown) => value),
    createQueryBuilder: jest.fn(),
  }
}

describe('SalesService', () => {
  const reps = repositoryMock()
  const commissions = repositoryMock()
  let service: SalesService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new SalesService(reps as any, commissions as any)
  })

  it('aceita o token apenas quando o vendedor está ativo', async () => {
    reps.findOne.mockResolvedValue(null)

    await service.getRepByToken('token-secreto')

    expect(reps.findOne).toHaveBeenCalledWith({
      where: { accessToken: 'token-secreto', status: 'active' },
    })
  })

  it('libera automaticamente comissões cujo prazo terminou', async () => {
    const commission = { id: 'commission-1', status: 'validating' } as SalesCommission
    commissions.find.mockResolvedValue([commission])

    await expect(service.releaseDueCommissions()).resolves.toBe(1)

    expect(commission.status).toBe('payable')
    expect(commissions.save).toHaveBeenCalledWith(commission)
  })

  it('não expõe o nome do cliente no portal do vendedor', async () => {
    const commission = {
      id: 'commission-1',
      userId: 'a1b2c3d4-1111-2222-3333-444455556666',
      user: { name: 'Nome Sensível' },
      status: 'pending',
      couponCode: 'MARIA10',
      commissionAmount: 48.95,
      grossAmount: null,
      paymentApprovedAt: null,
      commissionAvailableAt: null,
      commissionPaidAt: null,
      createdAt: new Date(),
    } as SalesCommission
    commissions.find
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([commission])

    const stats = await service.getStats('rep-1')

    expect(stats.commissions[0]).toMatchObject({ clientReference: 'Cliente A1B2C3' })
    expect(stats.commissions[0]).not.toHaveProperty('userName')
  })

  it('não cria uma segunda comissão para o mesmo cliente', async () => {
    const existing = { id: 'existing' } as SalesCommission
    commissions.findOne.mockResolvedValue(existing)

    const result = await service.createCommission({
      salesRepId: 'rep-1',
      userId: 'user-1',
      couponCode: 'MARIA10',
      commissionAmount: 48.95,
    })

    expect(result).toBe(existing)
    expect(commissions.create).not.toHaveBeenCalled()
    expect(commissions.save).not.toHaveBeenCalled()
  })
})
