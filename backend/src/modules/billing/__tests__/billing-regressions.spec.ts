import { getRepositoryToken } from '@nestjs/typeorm'
import { Test } from '@nestjs/testing'
import { DataSource } from 'typeorm'
import { AsaasService } from '../asaas.service'
import { BillingService } from '../billing.service'
import { Subscription } from '../entities/subscription.entity'

const makeSubscription = (overrides: Partial<Subscription> = {}): Subscription => ({
  id: 'local-sub-1',
  userId: 'user-1',
  plan: 'essencial',
  status: 'active',
  gatewayCustomerId: 'customer-1',
  gatewaySubscriptionId: 'gateway-sub-1',
  currentPeriodEnd: new Date(Date.now() + 15 * 86400000),
  trialEndsAt: null,
  cancelAtPeriodEnd: false,
  hasUsedTrial: true,
  promoCode: null,
  promoDiscountPercent: 0,
  promoCyclesTotal: 0,
  promoCyclesUsed: 0,
  regularMonthlyValue: null,
  lastPromoPaymentId: null,
  createdAt: new Date(),
  ...overrides,
} as Subscription)

describe('BillingService regressions', () => {
  let service: BillingService
  let repo: {
    findOne: jest.Mock
    save: jest.Mock
    create: jest.Mock
    remove: jest.Mock
    count: jest.Mock
    find: jest.Mock
  }
  let asaas: {
    updateSubscriptionPlan: jest.Mock
    cancelSubscription: jest.Mock
    getSubscriptionBilling: jest.Mock
  }

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      save: jest.fn(value => Promise.resolve(value)),
      create: jest.fn(value => value),
      remove: jest.fn(),
      count: jest.fn(),
      find: jest.fn(),
    }
    asaas = {
      updateSubscriptionPlan: jest.fn().mockResolvedValue(undefined),
      cancelSubscription: jest.fn().mockResolvedValue(undefined),
      getSubscriptionBilling: jest.fn().mockResolvedValue({
        subscription: { status: 'ACTIVE', nextDueDate: null },
        payments: [],
      }),
    }

    const module = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: getRepositoryToken(Subscription), useValue: repo },
        { provide: AsaasService, useValue: asaas },
        { provide: DataSource, useValue: { query: jest.fn().mockResolvedValue([]) } },
      ],
    }).compile()

    service = module.get(BillingService)
  })

  it('keeps an overdue subscription blocked until payment is confirmed', async () => {
    const subscription = makeSubscription({ status: 'past_due' })
    repo.findOne.mockResolvedValue(subscription)

    const result = await service.changePlan(
      { id: 'user-1', email: 'user@example.com' },
      'pro',
    )

    expect(asaas.updateSubscriptionPlan).toHaveBeenCalledWith('gateway-sub-1', 'pro')
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ plan: 'pro', status: 'past_due' }),
    )
    expect((result as any).status).toBe('past_due')
  })

  it('downgrades to free when paid-through access expires', async () => {
    const subscription = makeSubscription({
      plan: 'pro',
      cancelAtPeriodEnd: true,
      currentPeriodEnd: new Date(Date.now() - 1000),
    })
    repo.findOne.mockResolvedValue(subscription)

    const result = await service.getMine({ id: 'user-1', email: 'user@example.com' })

    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({
      plan: 'free',
      status: 'active',
      gatewayCustomerId: null,
      gatewaySubscriptionId: null,
      cancelAtPeriodEnd: false,
    }))
    expect((result as any).plan).toBe('free')
    expect((result as any).status).toBe('active')
  })

  it('records paid-through access before deleting the gateway subscription', async () => {
    const nextDueDate = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10)
    const subscription = makeSubscription({ currentPeriodEnd: null })
    repo.findOne.mockResolvedValue(subscription)
    asaas.getSubscriptionBilling.mockResolvedValue({
      subscription: { status: 'ACTIVE', nextDueDate },
      payments: [],
    })

    const result = await service.cancel({ id: 'user-1', email: 'user@example.com' })

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ cancelAtPeriodEnd: true }),
    )
    expect(asaas.cancelSubscription).toHaveBeenCalledWith('gateway-sub-1')
    expect((result as any).cancelAtPeriodEnd).toBe(true)
  })
})
