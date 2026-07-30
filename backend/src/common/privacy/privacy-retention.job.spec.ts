import { PrivacyRetentionJob } from './privacy-retention.job'

describe('PrivacyRetentionJob', () => {
  it('aplica os prazos por categoria de dado', async () => {
    const makeRepo = () => ({ delete: jest.fn().mockResolvedValue({ affected: 1 }) })
    const email = makeRepo()
    const login = makeRepo()
    const audit = makeRepo()
    const memories = makeRepo()
    const lock = { withLock: jest.fn(async (_key, fn) => fn()) }
    const job = new PrivacyRetentionJob(email as any, login as any, audit as any, memories as any, lock as any)
    const now = new Date('2026-07-30T12:00:00.000Z')

    await job.run(now)

    expect(email.delete).toHaveBeenCalledWith({ createdAt: expect.anything() })
    expect(login.delete).toHaveBeenCalledWith({ updatedAt: expect.anything() })
    expect(audit.delete).toHaveBeenCalledWith({ createdAt: expect.anything() })
    expect(memories.delete).toHaveBeenCalledWith({ expiresAt: expect.anything() })
  })
})
