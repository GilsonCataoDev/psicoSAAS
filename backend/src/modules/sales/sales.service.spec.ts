import { SalesService } from './sales.service'
import { SalesCommission } from './entities/sales-commission.entity'

function repositoryMock() {
  return {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    find: jest.fn(),
    create: jest.fn((value: unknown) => value),
    save: jest.fn(async (value: unknown) => value),
    exist: jest.fn(),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
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
    const token = '7b84a3a4-3197-4adc-9e8d-d43cf3347f58'

    await service.getRepByToken(token)

    expect(reps.findOne).toHaveBeenCalledWith({
      where: { accessToken: token, status: 'active' },
    })
  })

  it('rejeita token de portal malformado sem consultar o banco', async () => {
    await expect(service.getRepByToken('token-inexistente')).resolves.toBeNull()
    expect(reps.findOne).not.toHaveBeenCalled()
  })

  it('identifica atribuição de vendedor pelo cliente', async () => {
    commissions.exist.mockResolvedValue(true)

    await expect(service.hasAttribution('user-1')).resolves.toBe(true)

    expect(commissions.exist).toHaveBeenCalledWith({ where: { userId: 'user-1' } })
  })

  it('libera automaticamente comissões cujo prazo terminou', async () => {
    commissions.update.mockResolvedValue({ affected: 1 })

    await expect(service.releaseDueCommissions()).resolves.toBe(1)

    expect(commissions.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'validating' }),
      { status: 'payable' },
    )
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
    commissions.find.mockResolvedValueOnce([commission])

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

  it('ignora pagamento sem identificador ou com valor inválido', async () => {
    await service.handlePaymentApproved('user-1', undefined as any, 97.90)
    await service.handlePaymentApproved('user-1', 'payment-1', 0)

    expect(commissions.findOne).not.toHaveBeenCalled()
    expect(commissions.save).not.toHaveBeenCalled()
    expect(commissions.update).not.toHaveBeenCalled()
  })

  it('limita a comissão a 50% do primeiro pagamento', async () => {
    commissions.findOne.mockResolvedValue({
      id: 'commission-1',
      status: 'pending',
      paymentId: null,
      commissionAmount: 48.95,
    } as SalesCommission)

    await service.handlePaymentApproved('user-1', 'payment-1', 34.90)

    expect(commissions.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'commission-1', status: 'pending' }),
      expect.objectContaining({ commissionAmount: 17.45, grossAmount: 34.90 }),
    )
  })

  it('mantém comissão já paga como valor a recuperar após estorno', async () => {
    commissions.update
      .mockResolvedValueOnce({ affected: 1 })
      .mockResolvedValueOnce({ affected: 0 })

    await service.handlePaymentReversed('user-1', 'payment-1', 'PAYMENT_CHARGEBACK_REQUESTED')

    expect(commissions.update).toHaveBeenNthCalledWith(
      1,
      { userId: 'user-1', paymentId: 'payment-1', status: 'paid' },
      expect.objectContaining({ status: 'clawback' }),
    )
  })
})
