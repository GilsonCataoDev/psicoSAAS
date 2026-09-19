import { ConfigService } from '@nestjs/config'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Test } from '@nestjs/testing'
import { User } from '../../auth/entities/user.entity'
import { EmailService } from '../../email/email.service'
import { AsaasService } from '../asaas.service'
import { BillingWebhookService } from '../billing-webhook.service'
import { Subscription } from '../entities/subscription.entity'
import { WebhookEvent } from '../entities/webhook-event.entity'
import { ReferralService } from '../../referral/referral.service'
import { SalesService } from '../../sales/sales.service'

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
  let referrals: { handlePaymentApproved: jest.Mock; handlePaymentReversed: jest.Mock }
  let sales: { hasAttribution: jest.Mock; handlePaymentApproved: jest.Mock; handlePaymentReversed: jest.Mock }
  let events: { create: jest.Mock; save: jest.Mock; exist: jest.Mock; delete: jest.Mock }

  beforeEach(async () => {
    subscriptions = {
      findOne: jest.fn(),
      save: jest.fn(value => Promise.resolve(value)),
    }
    events = {
      create: jest.fn(value => value),
      save: jest.fn(value => Promise.resolve(value)),
      exist: jest.fn().mockResolvedValue(false),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    }
    asaas = { updateSubscriptionPlan: jest.fn().mockResolvedValue(undefined) }
    referrals = {
      handlePaymentApproved: jest.fn().mockResolvedValue(undefined),
      handlePaymentReversed: jest.fn().mockResolvedValue(undefined),
    }
    sales = {
      hasAttribution: jest.fn().mockResolvedValue(false),
      handlePaymentApproved: jest.fn().mockResolvedValue(undefined),
      handlePaymentReversed: jest.fn().mockResolvedValue(undefined),
    }

    const module = await Test.createTestingModule({
      providers: [
        BillingWebhookService,
        { provide: getRepositoryToken(Subscription), useValue: subscriptions },
        { provide: getRepositoryToken(WebhookEvent), useValue: events },
        { provide: getRepositoryToken(User), useValue: { findOne: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn(() => 'webhook-secret') } },
        { provide: EmailService, useValue: { send: jest.fn() } },
        { provide: AsaasService, useValue: asaas },
        { provide: ReferralService, useValue: referrals },
        { provide: SalesService, useValue: sales },
      ],
    }).compile()

    service = module.get(BillingWebhookService)
  })

  it('registers referral commission from the first approved payment', async () => {
    subscriptions.findOne.mockResolvedValue(makeSubscription())

    await service.process({
      event: 'PAYMENT_RECEIVED',
      payment: { id: 'payment-1', subscription: 'gateway-sub-1', value: 97.90 },
    })

    expect(referrals.handlePaymentApproved).toHaveBeenCalledWith('user-1', 'payment-1', 97.90)
  })

  it('aguarda a comissão de vendedor antes de concluir o webhook', async () => {
    subscriptions.findOne.mockResolvedValue(makeSubscription())
    sales.hasAttribution.mockResolvedValue(true)
    let release!: () => void
    sales.handlePaymentApproved.mockReturnValue(new Promise<void>(resolve => { release = resolve }))

    let completed = false
    const processing = service.process({
      event: 'PAYMENT_RECEIVED',
      payment: { id: 'payment-1', subscription: 'gateway-sub-1', value: 97.90 },
    }).then(() => { completed = true })

    await new Promise(resolve => setImmediate(resolve))
    expect(completed).toBe(false)
    release()
    await processing
    expect(completed).toBe(true)
  })

  it('prioriza o cupom de vendedor e não gera comissão de indicação em duplicidade', async () => {
    subscriptions.findOne.mockResolvedValue(makeSubscription())
    sales.hasAttribution.mockResolvedValue(true)

    await service.process({
      event: 'PAYMENT_RECEIVED',
      payment: { id: 'payment-1', subscription: 'gateway-sub-1', value: 97.90 },
    })

    expect(sales.handlePaymentApproved).toHaveBeenCalled()
    expect(referrals.handlePaymentApproved).not.toHaveBeenCalled()
  })

  it('não reativa pagamento que já possui evento terminal', async () => {
    const subscription = makeSubscription({ status: 'past_due' })
    subscriptions.findOne.mockResolvedValue(subscription)
    events.exist.mockResolvedValue(true)

    await service.process({
      event: 'PAYMENT_CONFIRMED',
      payment: { id: 'payment-1', subscription: 'gateway-sub-1', value: 97.90 },
    })

    expect(subscription.status).toBe('past_due')
    expect(sales.handlePaymentApproved).not.toHaveBeenCalled()
    expect(referrals.handlePaymentApproved).not.toHaveBeenCalled()
  })

  it('libera a idempotência quando o processamento falha', async () => {
    subscriptions.findOne.mockResolvedValue(makeSubscription())
    sales.hasAttribution.mockResolvedValue(true)
    sales.handlePaymentApproved.mockRejectedValue(new Error('banco indisponível'))

    await expect(service.process({
      event: 'PAYMENT_RECEIVED',
      payment: { id: 'payment-1', subscription: 'gateway-sub-1', value: 97.90 },
    })).rejects.toThrow('banco indisponível')

    expect(events.delete).toHaveBeenCalledWith({ eventId: 'PAYMENT_RECEIVED:payment-1' })
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
      promoCode: 'PRO3490',
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
