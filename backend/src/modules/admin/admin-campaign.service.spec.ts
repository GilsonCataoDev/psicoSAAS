import { ConflictException } from '@nestjs/common'
import { AdminCampaignService } from './admin-campaign.service'

describe('AdminCampaignService', () => {
  const recipient = { subscriptionId: 'sub-1', name: 'Ana Souza', email: 'ana@example.com' }

  function setup(options: { locked?: boolean; sendFails?: boolean } = {}) {
    const query = jest.fn()
      .mockResolvedValueOnce([{ locked: options.locked ?? true }])
      .mockResolvedValueOnce([recipient])
      .mockResolvedValueOnce([{ pg_advisory_unlock: true }])
    const subscriptions = { update: jest.fn().mockResolvedValue({ affected: 1 }) }
    const email = {
      sendProUpgradeOffer: options.sendFails
        ? jest.fn().mockRejectedValue(new Error('provider error'))
        : jest.fn().mockResolvedValue(undefined),
    }
    return {
      service: new AdminCampaignService({ query } as any, subscriptions as any, email as any),
      query,
      subscriptions,
      email,
    }
  }

  it('envia uma única vez apenas para contas Free elegíveis', async () => {
    const { service, query, subscriptions, email } = setup()

    await expect(service.sendProUpgradeOffer()).resolves.toEqual({ eligible: 1, sent: 1, failed: 0 })

    expect(query.mock.calls[1][0]).toContain(`s.plan = 'free'`)
    expect(query.mock.calls[1][0]).toContain('u."emailVerified" = true')
    expect(query.mock.calls[1][0]).toContain('"upgradeOfferEmailedAt" IS NULL')
    expect(query.mock.calls[1][0]).toContain("preferences->>'marketingEmails'")
    expect(subscriptions.update).toHaveBeenCalledTimes(1)
    expect(email.sendProUpgradeOffer).toHaveBeenCalledWith('Ana Souza', 'ana@example.com')
  })

  it('libera a marcação para nova tentativa quando o provedor falha', async () => {
    const { service, subscriptions } = setup({ sendFails: true })

    await expect(service.sendProUpgradeOffer()).resolves.toEqual({ eligible: 1, sent: 0, failed: 1 })

    expect(subscriptions.update).toHaveBeenCalledTimes(2)
    expect(subscriptions.update.mock.calls[1][1]).toEqual({ upgradeOfferEmailedAt: null })
  })

  it('bloqueia disparos concorrentes', async () => {
    const query = jest.fn().mockResolvedValueOnce([{ locked: false }])
    const service = new AdminCampaignService({ query } as any, {} as any, {} as any)

    await expect(service.sendProUpgradeOffer()).rejects.toBeInstanceOf(ConflictException)
    expect(query).toHaveBeenCalledTimes(1)
  })
})
