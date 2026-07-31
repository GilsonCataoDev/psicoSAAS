import { BadRequestException } from '@nestjs/common'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Test } from '@nestjs/testing'
import { DataSource } from 'typeorm'
import { BillingService } from '../billing.service'
import { Subscription } from '../entities/subscription.entity'
import { AsaasService } from '../asaas.service'

const makeSub = (overrides: Partial<Subscription> = {}): Subscription => ({
  id: 'sub-1',
  userId: 'user-1',
  plan: 'pro',
  status: 'trialing',
  gatewayCustomerId: null,
  gatewaySubscriptionId: null,
  currentPeriodEnd: null,
  trialEndsAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
  cancelAtPeriodEnd: false,
  hasUsedTrial: true,
  createdAt: new Date(),
  ...overrides,
} as Subscription)

const makeUser = (email = 'user@example.com') => ({ id: 'user-1', email } as any)

function makeRepo() {
  return {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(v => Promise.resolve(v)),
    create: jest.fn(v => v),
    update: jest.fn(),
    count: jest.fn(),
  }
}

describe('BillingService', () => {
  let service: BillingService
  let repo: ReturnType<typeof makeRepo>
  let dataSource: { query: jest.Mock }

  beforeEach(async () => {
    repo = makeRepo()
    dataSource = {
      query: jest.fn((sql: string) => {
        if (sql.includes('"referralCode"')) {
          return Promise.resolve([{ referralCode: null }])
        }

        return Promise.resolve([{ daysSinceSignup: '0', patients: '0', sessions: '0' }])
      }),
    }

    const module = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: getRepositoryToken(Subscription), useValue: repo },
        {
          provide: AsaasService,
          useValue: {
            createCustomer: jest.fn().mockResolvedValue('cus_123'),
            createSubscription: jest.fn().mockResolvedValue('sub_gw_123'),
            cancelSubscription: jest.fn().mockResolvedValue(undefined),
            updateSubscriptionNextDueDate: jest.fn().mockResolvedValue(undefined),
            postponeSubscriptionOpenPayments: jest.fn().mockResolvedValue(0),
            addDays: jest.fn((n: number) => {
              const d = new Date()
              d.setDate(d.getDate() + n)
              return d.toISOString().slice(0, 10)
            }),
          },
        },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile()

    service = module.get(BillingService)
  })

  // ── Trial normalization ─────────────────────────────────────────────────────

  describe('normalizeSubscriptionState (via getMine)', () => {
    it('transitions expired trial without gateway to canceled', async () => {
      const sub = makeSub({
        status: 'trialing',
        trialEndsAt: new Date(Date.now() - 1000),
        gatewaySubscriptionId: null,
      })
      repo.findOne.mockResolvedValue(sub)

      const result = await service.getMine(makeUser())

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'canceled' }),
      )
      expect((result as any).status).toBe('canceled')
    })

    it('transitions expired trial WITH gateway to past_due', async () => {
      const sub = makeSub({
        status: 'trialing',
        trialEndsAt: new Date(Date.now() - 1000),
        gatewaySubscriptionId: 'sub_gateway_123',
      })
      repo.findOne.mockResolvedValue(sub)

      const result = await service.getMine(makeUser())

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'past_due' }),
      )
      expect((result as any).status).toBe('past_due')
    })

    it('keeps active trial unchanged', async () => {
      const sub = makeSub({
        status: 'trialing',
        trialEndsAt: new Date(Date.now() + 3 * 24 * 3600 * 1000),
      })
      repo.findOne.mockResolvedValue(sub)

      await service.getMine(makeUser())

      expect(repo.save).not.toHaveBeenCalled()
    })
  })

  // ── cancelAtPeriodEnd expiry ────────────────────────────────────────────────

  describe('cancelAtPeriodEnd normalization', () => {
    it('downgrades to free when period has ended and cancelAtPeriodEnd is true', async () => {
      const sub = makeSub({
        status: 'active',
        cancelAtPeriodEnd: true,
        currentPeriodEnd: new Date(Date.now() - 1000),
      })
      repo.findOne.mockResolvedValue(sub)

      const result = await service.getMine(makeUser())

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          plan: 'free',
          status: 'active',
          cancelAtPeriodEnd: false,
          gatewayCustomerId: null,
          gatewaySubscriptionId: null,
        }),
      )
      expect((result as any).status).toBe('active')
      expect((result as any).plan).toBe('free')
    })

    it('does not cancel when cancelAtPeriodEnd is false', async () => {
      const sub = makeSub({
        status: 'active',
        cancelAtPeriodEnd: false,
        currentPeriodEnd: new Date(Date.now() - 1000),
      })
      repo.findOne.mockResolvedValue(sub)

      await service.getMine(makeUser())

      expect(repo.save).not.toHaveBeenCalled()
    })
  })

  // ── hasUsedTrial guard ──────────────────────────────────────────────────────

  describe('subscribe – hasUsedTrial guard', () => {
    it('does not start trial when user already used trial', async () => {
      const sub = makeSub({ hasUsedTrial: true, status: 'canceled', gatewaySubscriptionId: null })
      repo.findOne.mockResolvedValue(sub)
      repo.save.mockResolvedValue({ ...sub, status: 'active', hasUsedTrial: true })

      const user = { ...makeUser(), name: 'Test', createdAt: new Date() } as any

      await service.subscribe(user, 'pro', 'card-token')

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ hasUsedTrial: true, status: 'active' }),
      )
    })

    it('throws for invalid plan', async () => {
      const user = { ...makeUser(), name: 'Test', createdAt: new Date() } as any

      await expect(service.subscribe(user, 'nonexistent', 'card-token'))
        .rejects.toThrow(BadRequestException)
    })

    it('throws when no credit card token provided', async () => {
      const user = { ...makeUser(), name: 'Test', createdAt: new Date() } as any

      await expect(service.subscribe(user, 'pro'))
        .rejects.toThrow(BadRequestException)
    })
  })
})
