import { getRepositoryToken } from '@nestjs/typeorm'
import { Test } from '@nestjs/testing'
import { AdvisoryLockService } from '../../../common/advisory-lock/advisory-lock.service'
import { AsaasService } from '../asaas.service'
import { BillingReconciliationJob } from '../billing-reconciliation.job'
import { Subscription } from '../entities/subscription.entity'

const makeSubscription = (overrides: Partial<Subscription> = {}): Subscription => ({
  id: 'local-sub-1',
  userId: 'user-1',
  plan: 'pro',
  status: 'trialing',
  gatewayCustomerId: 'customer-1',
  gatewaySubscriptionId: 'gateway-sub-1',
  currentPeriodEnd: null,
  trialEndsAt: new Date(Date.now() + 7 * 86400000),
  cancelAtPeriodEnd: false,
  hasUsedTrial: true,
  createdAt: new Date(),
  ...overrides,
} as Subscription)

describe('BillingReconciliationJob', () => {
  let job: BillingReconciliationJob
  let subscriptions: { find: jest.Mock; save: jest.Mock }
  let asaas: { getSubscriptionBilling: jest.Mock }

  beforeEach(async () => {
    subscriptions = {
      find: jest.fn(),
      save: jest.fn(value => Promise.resolve(value)),
    }
    asaas = { getSubscriptionBilling: jest.fn() }

    const module = await Test.createTestingModule({
      providers: [
        BillingReconciliationJob,
        { provide: getRepositoryToken(Subscription), useValue: subscriptions },
        { provide: AsaasService, useValue: asaas },
        {
          provide: AdvisoryLockService,
          useValue: { withLock: jest.fn((_key, callback) => callback()) },
        },
      ],
    }).compile()

    job = module.get(BillingReconciliationJob)
  })

  it('does not end a valid trial just because the gateway subscription is active', async () => {
    const subscription = makeSubscription()
    asaas.getSubscriptionBilling.mockResolvedValue({
      subscription: {
        status: 'ACTIVE',
        nextDueDate: subscription.trialEndsAt!.toISOString().slice(0, 10),
      },
      payments: [],
    })

    await (job as any).reconcile(subscription)

    expect(subscription.status).toBe('trialing')
    expect(subscription.trialEndsAt).not.toBeNull()
    expect(subscriptions.save).not.toHaveBeenCalled()
  })

  it.each(['REFUNDED', 'CHARGEBACK_REQUESTED', 'DELETED'])(
    'marks %s payments as past due',
    async (paymentStatus) => {
      const subscription = makeSubscription({ status: 'active', trialEndsAt: null })
      asaas.getSubscriptionBilling.mockResolvedValue({
        subscription: { status: 'ACTIVE', nextDueDate: '2026-08-29' },
        payments: [{
          id: 'payment-1',
          status: paymentStatus,
          value: 149,
          dueDate: '2026-07-01',
          paymentDate: null,
          confirmedDate: null,
        }],
      })

      await (job as any).reconcile(subscription)

      expect(subscription.status).toBe('past_due')
      expect(subscriptions.save).toHaveBeenCalled()
    },
  )

  it('persists a downgrade when the gateway subscription is inactive', async () => {
    const subscription = makeSubscription({
      status: 'active',
      trialEndsAt: null,
    })
    asaas.getSubscriptionBilling.mockResolvedValue({
      subscription: { status: 'INACTIVE', nextDueDate: null },
      payments: [],
    })

    await (job as any).reconcile(subscription)

    expect(subscriptions.save).toHaveBeenCalledWith(expect.objectContaining({
      plan: 'free',
      status: 'active',
      gatewaySubscriptionId: null,
    }))
  })
})
