import { getRepositoryToken } from '@nestjs/typeorm'
import { Test } from '@nestjs/testing'
import { ReferralService } from './referral.service'
import { Referral } from './entities/referral.entity'
import { ReferralPayoutProfile } from './entities/referral-payout-profile.entity'
import { User } from '../auth/entities/user.entity'

const repo = () => ({
  findOne: jest.fn(), find: jest.fn(), findBy: jest.fn(),
  create: jest.fn(value => value), save: jest.fn(value => Promise.resolve(value)), update: jest.fn(),
})

describe('ReferralService commissions', () => {
  let service: ReferralService
  let referrals: ReturnType<typeof repo>
  let users: ReturnType<typeof repo>

  beforeEach(async () => {
    referrals = repo()
    users = repo()
    const module = await Test.createTestingModule({
      providers: [
        ReferralService,
        { provide: getRepositoryToken(Referral), useValue: referrals },
        { provide: getRepositoryToken(ReferralPayoutProfile), useValue: repo() },
        { provide: getRepositoryToken(User), useValue: users },
      ],
    }).compile()
    service = module.get(ReferralService)
  })

  it('attributes a referral without granting a discount or free benefit', async () => {
    referrals.findOne
      .mockResolvedValueOnce({ referrerId: 'referrer-1', code: 'MARIA' })
      .mockResolvedValueOnce(null)

    await service.applyReferral('maria', { id: 'new-user' } as User)

    expect(referrals.save).toHaveBeenCalledWith(expect.objectContaining({
      referrerId: 'referrer-1', referredId: 'new-user', status: 'captured', rewardGranted: false,
    }))
    expect(users.update).toHaveBeenCalledWith('new-user', { referralCode: 'MARIA' })
  })

  it('creates the fixed commission only on the first approved payment', async () => {
    const referral = { referredId: 'new-user', status: 'captured', firstPaymentId: null }
    referrals.findOne.mockResolvedValue(referral)

    await service.handlePaymentApproved('new-user', 'pay-1', 97.90)
    await service.handlePaymentApproved('new-user', 'pay-2', 97.90)

    expect(referrals.save).toHaveBeenCalledTimes(1)
    expect(referrals.save).toHaveBeenCalledWith(expect.objectContaining({
      firstPaymentId: 'pay-1', firstPaymentGross: '97.90', commissionAmount: '48.95', status: 'validating',
    }))
  })

  it('invalidates the commission when the first payment is refunded', async () => {
    const referral = { referredId: 'new-user', firstPaymentId: 'pay-1', status: 'validating' }
    referrals.findOne.mockResolvedValue(referral)

    await service.handlePaymentReversed('new-user', 'pay-1', 'PAYMENT_REFUNDED')

    expect(referrals.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'refunded' }))
  })
})
