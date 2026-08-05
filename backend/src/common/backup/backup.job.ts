import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { randomUUID } from 'crypto'
import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import { AdvisoryLockService, JOB_LOCK_KEYS } from '../advisory-lock/advisory-lock.service'
import { StorageService } from '../storage/storage.service'
import { HeartbeatService } from '../monitoring/heartbeat.service'

const execFileAsync = promisify(execFile)
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000
const BACKUP_PREFIX = 'backups/'
const DEFAULT_RETENTION_DAYS = 14

/**
 * Backup diário do banco via pg_dump (formato custom, já comprimido) enviado
 * para o bucket privado (R2/S3). Sem STORAGE_* configurado, o job não roda —
 * não há para onde mandar o dump. Retenção configurável apaga backups antigos
 * do bucket para não crescer sem limite.
 */
@Injectable()
export class BackupJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BackupJob.name)
  private timer?: NodeJS.Timeout
  private running = false

  constructor(
    private readonly storage: StorageService,
    private readonly lock: AdvisoryLockService,
    private readonly heartbeat: HeartbeatService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => this.run().catch((err) => this.logger.error(err)), TWENTY_FOUR_HOURS_MS)
    setTimeout(() => this.run().catch((err) => this.logger.error(err)), 60_000)
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer)
  }

  async run(): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      await this.lock.withLock(JOB_LOCK_KEYS.DATABASE_BACKUP, () => this.runLocked())
      this.heartbeat.ping('BETTERSTACK_HEARTBEAT_BACKUP_URL')
    } finally {
      this.running = false
    }
  }

  private async runLocked(): Promise<void> {
    if (!this.storage.isPrivateConfigured()) {
      this.logger.warn('Backup nao executado: STORAGE_* nao configurado')
      return
    }
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      this.logger.warn('Backup nao executado: DATABASE_URL nao configurado')
      return
    }

    const tmpFile = path.join(os.tmpdir(), `usecognia-backup-${randomUUID()}.dump`)
    try {
      await execFileAsync('pg_dump', [databaseUrl, '-Fc', '-f', tmpFile])
      const body = await fs.readFile(tmpFile)
      const dateLabel = new Date().toISOString().slice(0, 10)
      const key = `${BACKUP_PREFIX}db-${dateLabel}.dump`
      await this.storage.uploadPrivate(key, body, 'application/octet-stream')
      this.logger.log(`Backup gerado: ${key} (${(body.length / (1024 * 1024)).toFixed(1)} MB)`)
      await this.cleanupOldBackups()
    } catch (error: any) {
      this.logger.error(`Falha ao gerar backup: ${error?.message ?? error}`)
    } finally {
      await fs.rm(tmpFile, { force: true })
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    const retentionDays = Number(process.env.BACKUP_RETENTION_DAYS) || DEFAULT_RETENTION_DAYS
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000
    const objects = await this.storage.list(BACKUP_PREFIX)
    const expired = objects.filter(o => o.lastModified && o.lastModified.getTime() < cutoff)
    for (const obj of expired) {
      await this.storage.delete(obj.key)
    }
    if (expired.length > 0) {
      this.logger.log(`Backups antigos removidos: ${expired.length} (retencao ${retentionDays}d)`)
    }
  }
}
