import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, MoreThan } from 'typeorm'
import { AuditLog } from '../../modules/audit/entities/audit-log.entity'

/**
 * Detecta e bloqueia ataques de credential stuffing e brute-force distribuído.
 *
 * DIFERENTE do lockout por conta (em auth.service):
 *   - O lockout por conta pega ataques direcionados a um único usuário.
 *   - Este serviço pega ataques CROSS-ACCOUNT de um mesmo IP — onde cada
 *     conta recebe apenas 1-2 tentativas (padrão de credential stuffing).
 *
 * Implementação sem Redis (fallback DB):
 *   - Conta entradas de LOGIN_FAILED por IP nos audit_logs (última hora).
 *   - Mais lenta que Redis mas funcional sem infraestrutura adicional.
 *   - Migrar para Redis quando escala exigir (trocar apenas este serviço).
 */
const IP_FAIL_THRESHOLD = 20
const COUNT_WINDOW_MS   = 60 * 60 * 1000  // 1 hora
const BLOCK_WINDOW_MS   = 15 * 60 * 1000  // 15 minutos de bloqueio

@Injectable()
export class SuspiciousActivityService {
  private readonly logger = new Logger(SuspiciousActivityService.name)

  // Cache em memória por processo — suficiente para instância única.
  // Em múltiplas instâncias, o DB serve como fonte de verdade.
  private readonly blockedIps = new Map<string, number>() // ip → timestamp de expiração

  constructor(
    @InjectRepository(AuditLog) private readonly auditLogs: Repository<AuditLog>,
  ) {}

  async isIpBlocked(ip: string): Promise<boolean> {
    if (!ip || ip === 'unknown') return false

    // Checa cache em memória primeiro (fast path)
    const expiry = this.blockedIps.get(ip)
    if (expiry) {
      if (Date.now() < expiry) return true
      this.blockedIps.delete(ip)
    }

    // Checa audit_logs para persistência entre restarts
    try {
      const since = new Date(Date.now() - BLOCK_WINDOW_MS)
      const count = await this.auditLogs.count({
        where: { action: 'SECURITY_IP_BLOCKED', ip, createdAt: MoreThan(since) },
      })
      if (count > 0) {
        this.blockedIps.set(ip, Date.now() + BLOCK_WINDOW_MS)
        return true
      }
    } catch {
      return false // fail open
    }

    return false
  }

  async recordFailedAttempt(ip: string, email: string): Promise<boolean> {
    if (!ip || ip === 'unknown') return false

    try {
      const since = new Date(Date.now() - COUNT_WINDOW_MS)
      const failCount = await this.auditLogs.count({
        where: { action: 'LOGIN_FAILED', ip, createdAt: MoreThan(since) },
      })

      if (failCount >= IP_FAIL_THRESHOLD) {
        const alreadyBlocked = await this.isIpBlocked(ip)
        if (!alreadyBlocked) {
          await this.blockIp(ip, email, failCount)
          return true
        }
      }
    } catch (err: any) {
      this.logger.warn(`recordFailedAttempt error: ${err?.message}`)
    }

    return false
  }

  async blockIp(ip: string, _triggerEmail: string, failCount: number): Promise<void> {
    try {
      this.blockedIps.set(ip, Date.now() + BLOCK_WINDOW_MS)

      // Registra no audit_log para persistência entre restarts
      await this.auditLogs.save(
        this.auditLogs.create({
          userId: 'system',
          action: 'SECURITY_IP_BLOCKED',
          resource: 'ip',
          resourceId: ip,
          ip,
          metadata: { failCount, blockDurationMs: BLOCK_WINDOW_MS },
        }),
      )

      this.logger.warn(`IP ${ip} bloqueado após ${failCount} falhas em 1h`)
    } catch (err: any) {
      this.logger.error(`blockIp error para ${ip}: ${err?.message}`)
    }
  }
}
