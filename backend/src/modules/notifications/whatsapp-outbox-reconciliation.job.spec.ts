import { JOB_LOCK_KEYS } from '../../common/advisory-lock/advisory-lock.service'
import { WhatsAppOutboxReconciliationJob } from './whatsapp-outbox-reconciliation.job'

describe('WhatsAppOutboxReconciliationJob', () => {
  it('reconciles ambiguous deliveries under its dedicated advisory lock', async () => {
    const notifications = { reconcileWhatsAppOutbox: jest.fn().mockResolvedValue(2) }
    const lock = {
      withLock: jest.fn(async (_key: number, callback: () => Promise<number>) => callback()),
    }
    const job = new WhatsAppOutboxReconciliationJob(notifications as any, lock as any)

    const processed = await job.run(new Date('2026-08-10T11:00:00Z'))

    expect(processed).toBe(2)
    expect(lock.withLock).toHaveBeenCalledWith(
      JOB_LOCK_KEYS.WHATSAPP_OUTBOX_RECONCILIATION,
      expect.any(Function),
    )
  })
})
