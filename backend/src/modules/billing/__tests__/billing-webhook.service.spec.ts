import { ConfigService } from '@nestjs/config'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Test } from '@nestjs/testing'
import { User } from '../../auth/entities/user.entity'
import { EmailService } from '../../email/email.service'
import { AsaasService } from '../asaas.service'
import { BillingWebhookService } from '../billing-webhook.service'
import { Subscription } from '../entities/subscription.entity'
import { WebhookEvent } from '../entities/webhook-event.entity'

const makeSubscription = (overrides: Partial<Subscription> = {}): Subscription => ({
  id: 'local-sub-1',
  userId: 'user-1',
  plan: 'pro',
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

describe('BillingWebhookService', () => {
  let service: BillingWebhookService
  let subscriptions: { findOne: jest.Mock; save: jest.Mock }
  let asaas: { updateSubscriptionPlan: jest.Mock }

  beforeEach(async () => {
    subscriptions = {
      findOne: jest.fn(),
      save: jest.fn(value => Promise.resolve(value)),
    }
    const events = {
      create: jest.fn(value => value),
      save: jest.fn(value => Promise.resolve(value)),
    }
    asaas = { updateSubscriptionPlan: jest.fn().mockResolvedValue(undefined) }

    const module = await Test.createTestingModule({
      providers: [
        BillingWebhookService,
        { provide: getRepositoryToken(Subscription), useValue: subscriptions },
        { provide: getRepositoryToken(WebhookEvent), useValue: events },
        { provide: getRepositoryToken(User), useValue: { findOne: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn(() => 'webhook-secret') } },
        { provide: EmailService, useValue: { send: jest.fn() } },
        { provide: AsaasService, useValue: asaas },
      ],
    }).compile()

    service = module.get(BillingWebhookService)
  })

  it.each([
    'PAYMENT_REFUNDED',
    'PAYMENT_REFUND_IN_PROGRESS',
    'PAYMENT_PARTIALLY_REFUNDED',
    'PAYMENT_CHARGEBACK_REQUESTED',
    'PAYMENT_CHARGEBACK_DISPUTE',
    'PAYMENT_RECEIVED_IN_CASH_UNDONE',
    'PAYMENT_DELETED',
  ])('blocks paid access for %s', async (event) => {
    const subscription = makeSubscription()
    subscriptions.findOne.mockResolvedValue(subscription)

    await service.process({
      event,
      payment: { id: `payment-${event}`, subscription: 'gateway-sub-1' },
    })

    expect(subscriptions.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'past_due' }),
    )
  })

  it('keeps paid-through access when the app requested cancellation', async () => {
    const subscription = makeSubscription({
      cancelAtPeriodEnd: true,
      currentPeriodEnd: new Date(Date.now() + 15 * 86400000),
    })
    subscriptions.findOne.mockResolvedValue(subscription)

    await service.process({
      event: 'SUBSCRIPTION_DELETED',
      subscription: { id: 'gateway-sub-1', externalReference: 'local-sub-1' },
    })

    expect(subscriptions.save).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: 'pro',
        status: 'active',
        cancelAtPeriodEnd: true,
      }),
    )
  })

  it('downgrades an externally deleted subscription to free', async () => {
    const subscription = makeSubscription({ cancelAtPeriodEnd: false })
    subscriptions.findOne.mockResolvedValue(subscription)

    await service.process({
      event: 'SUBSCRIPTION_DELETED',
      subscription: { id: 'gateway-sub-1', externalReference: 'local-sub-1' },
    })

    expect(subscriptions.save).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: 'free',
        status: 'active',
        gatewayCustomerId: null,
        gatewaySubscriptionId: null,
      }),
    )
  })

  it('restores R$ 97,90 after the single promotional payment', async () => {
    const subscription = makeSubscription({
      promoCode: 'PRO3790',
      promoDiscountPercent: 0,
      promoCyclesTotal: 1,
      promoCyclesUsed: 0,
      regularMonthlyValue: '97.90',
    })
    subscriptions.findOne.mockResolvedValue(subscription)

    await service.process({
      event: 'PAYMENT_RECEIVED',
      payment: { id: 'payment-promo-1', subscription: 'gateway-sub-1' },
    })

    expect(asaas.updateSubscriptionPlan).toHaveBeenCalledWith(
      'gateway-sub-1',
      'pro',
      { updatePendingPayments: true },
    )
    expect(subscriptions.save).toHaveBeenCalledWith(expect.objectContaining({
      promoCode: null,
      promoCyclesTotal: 0,
      promoCyclesUsed: 1,
    }))
  })
})
