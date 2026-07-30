import { ConfigService } from '@nestjs/config'
import { AsaasService } from '../asaas.service'

describe('AsaasService plan changes', () => {
  let service: AsaasService
  let put: jest.Mock

  beforeEach(() => {
    const config = {
      get: jest.fn((key: string) => key === 'NODE_ENV' ? 'test' : undefined),
      getOrThrow: jest.fn(() => 'test-api-key'),
    } as unknown as ConfigService
    service = new AsaasService(config)
    put = jest.fn().mockResolvedValue({ data: {} })
    ;(service as any).api.put = put
  })

  it('does not rewrite already pending charges during a normal plan change', async () => {
    await service.updateSubscriptionPlan('gateway-sub-1', 'pro')

    expect(put).toHaveBeenCalledWith('/subscriptions/gateway-sub-1', {
      value: 149,
      description: 'UseCognia - Plano pro',
      updatePendingPayments: false,
    })
  })

  it('can explicitly update a pending charge when a promotion ends', async () => {
    await service.updateSubscriptionPlan(
      'gateway-sub-1',
      'essencial',
      { updatePendingPayments: true },
    )

    expect(put).toHaveBeenCalledWith('/subscriptions/gateway-sub-1', {
      value: 79,
      description: 'UseCognia - Plano essencial',
      updatePendingPayments: true,
    })
  })
})
