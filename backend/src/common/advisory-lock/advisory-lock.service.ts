import { Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'

// Chaves estáveis por job — nunca reutilize um valor removido
export const JOB_LOCK_KEYS = {
  APPOINTMENT_REMINDER:   1001,
  PAYMENT_REMINDER:       1002,
  BILLING_TRIAL_EMAIL:    1003,
  BILLING_RECONCILIATION: 1004,
  CHURN_SCORE:            1005,
  WHATSAPP_LOG_RETENTION: 1006,
} as const

@Injectable()
export class AdvisoryLockService {
  private readonly logger = new Logger(AdvisoryLockService.name)

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Executa fn() apenas se conseguir o advisory lock pg_try_advisory_lock(key).
   * Garante que somente uma instância do processo executa o job por vez.
   * Usa um QueryRunner dedicado para que lock e unlock ocorram na mesma conexão.
   */
  async withLock<T>(key: number, fn: () => Promise<T>): Promise<T | undefined> {
    const runner = this.dataSource.createQueryRunner()
    await runner.connect()
    try {
      const result = await runner.query(
        'SELECT pg_try_advisory_lock($1::bigint) AS acquired', [key],
      ) as Array<{ acquired: boolean }>
      const [row] = result
      if (!row.acquired) {
        this.logger.debug(`job_lock key=${key} skipped=already_held`)
        return undefined
      }
      try {
        return await fn()
      } finally {
        await runner.query('SELECT pg_advisory_unlock($1::bigint)', [key]).catch((err: unknown) => {
          this.logger.warn(`job_lock key=${key} unlock_failed: ${err instanceof Error ? err.message : err}`)
        })
      }
    } finally {
      await runner.release()
    }
  }
}
