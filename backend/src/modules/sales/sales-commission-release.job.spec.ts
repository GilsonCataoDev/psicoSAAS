import { SalesCommissionReleaseJob } from './sales-commission-release.job'

describe('SalesCommissionReleaseJob', () => {
  it('libera comissões dentro do advisory lock', async () => {
    const sales = { releaseDueCommissions: jest.fn().mockResolvedValue(2) }
    const lock = {
      withLock: jest.fn(async (_key: number, callback: () => Promise<void>) => callback()),
    }
    const job = new SalesCommissionReleaseJob(sales as any, lock as any)

    await job.run()

    expect(lock.withLock).toHaveBeenCalledTimes(1)
    expect(sales.releaseDueCommissions).toHaveBeenCalledTimes(1)
  })
})
