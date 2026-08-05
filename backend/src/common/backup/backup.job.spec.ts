import { BackupJob } from './backup.job'

describe('BackupJob', () => {
  function makeJob(storageOverrides: Partial<Record<string, jest.Mock>> = {}) {
    const storage = {
      isPrivateConfigured: jest.fn().mockReturnValue(true),
      uploadPrivate: jest.fn().mockResolvedValue(undefined),
      list: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue(undefined),
      ...storageOverrides,
    }
    const lock = { withLock: jest.fn(async (_key: number, fn: () => Promise<void>) => fn()) }
    const heartbeat = { ping: jest.fn() }
    const job = new BackupJob(storage as any, lock as any, heartbeat as any)
    return { job, storage, lock, heartbeat }
  }

  const originalEnv = process.env.DATABASE_URL
  afterEach(() => { process.env.DATABASE_URL = originalEnv })

  it('nao executa quando storage nao esta configurado', async () => {
    const { job, storage } = makeJob({ isPrivateConfigured: jest.fn().mockReturnValue(false) })
    await job.run()
    expect(storage.uploadPrivate).not.toHaveBeenCalled()
  })

  it('nao executa quando DATABASE_URL nao esta setado', async () => {
    delete process.env.DATABASE_URL
    const { job, storage } = makeJob()
    await job.run()
    expect(storage.uploadPrivate).not.toHaveBeenCalled()
  })

  it('remove apenas backups mais antigos que a retencao', async () => {
    const now = Date.now()
    const old = { key: 'backups/db-old.dump', lastModified: new Date(now - 20 * 24 * 60 * 60 * 1000) }
    const recent = { key: 'backups/db-recent.dump', lastModified: new Date(now - 1 * 24 * 60 * 60 * 1000) }
    const { job, storage } = makeJob({ list: jest.fn().mockResolvedValue([old, recent]) })

    await (job as any).cleanupOldBackups()

    expect(storage.delete).toHaveBeenCalledWith(old.key)
    expect(storage.delete).not.toHaveBeenCalledWith(recent.key)
  })
})
