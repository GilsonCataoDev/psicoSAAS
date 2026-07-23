import { WhatsAppLogRetentionJob } from './whatsapp-log-retention.job'

describe('WhatsAppLogRetentionJob', () => {
  it('remove logs anteriores a sete dias', async () => {
    const logs = { delete: jest.fn().mockResolvedValue({ affected: 3 }) }
    const lock = { withLock: jest.fn((_key, fn) => fn()) }
    const job = new WhatsAppLogRetentionJob(logs as any, lock as any)
    const now = new Date('2026-07-21T12:00:00.000Z')

    await expect(job.run(now)).resolves.toBe(3)
    const criteria = logs.delete.mock.calls[0][0]
    expect(criteria.createdAt._value).toEqual(new Date('2026-07-14T12:00:00.000Z'))
  })
})
