import { JOB_LOCK_KEYS } from '../../common/advisory-lock/advisory-lock.service'
import { WhatsAppOutboxRetryJob } from './whatsapp-outbox-retry.job'

describe('WhatsAppOutboxRetryJob', () => {
  it('runs retry processing under the dedicated advisory lock', async () => {
    const notifications = { retryDueWhatsAppOutbox: jest.fn().mockResolvedValue(2) }
    const lock = {
      withLock: jest.fn(async (_key: number, callback: () => Promise<number>) => callback()),
    }
    const job = new WhatsAppOutboxRetryJob(notifications as any, lock as any)

    const processed = await job.run(new Date('2026-08-10T11:00:00Z'))

    expect(processed).toBe(2)
    expect(lock.withLock).toHaveBeenCalledWith(
      JOB_LOCK_KEYS.WHATSAPP_OUTBOX_RETRY,
      expect.any(Function),
    )
    expect(notifications.retryDueWhatsAppOutbox).toHaveBeenCalled()
  })
})
