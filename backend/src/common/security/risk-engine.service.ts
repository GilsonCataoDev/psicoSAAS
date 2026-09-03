import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, MoreThan } from 'typeorm'
import { AuditLog } from '../../modules/audit/entities/audit-log.entity'
import { LoginAttempt } from '../../modules/auth/entities/login-attempt.entity'

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface RiskSignals {
  ipFailureCount:       number   // falhas recentes deste IP em qualquer conta
  accountRecentLockout: boolean  // conta bloqueada na última hora
  recentTokenReuse:     boolean  // replay attack detectado nas últimas 24h
}

export interface RiskAssessment {
  score:   number     // 0–100
  level:   RiskLevel
  signals: RiskSignals
}

/**
 * Score de risco para cada login bem-sucedido.
 *
 * LOW      (0–29)  : Normal — prossegue.
 * MEDIUM  (30–59)  : Elevado — log de evento, prossegue.
 * HIGH    (60–79)  : Alto — log, prossegue (gancho para MFA futuro).
 * CRITICAL (80–100): Bloqueia login e revoga todas as sessões do usuário.
 *
 * Contribuições ao score:
 *   Falhas IP  5–9           : +10
 *   Falhas IP 10–14          : +20
 *   Falhas IP ≥15            : +30
 *   Lockout recente na conta : +20
 *   Reuso de token (24h)     : +50  ← sinal mais forte
 */
const THRESHOLDS = { medium: 30, high: 60, critical: 80 } as const

@Injectable()
export class RiskEngineService {
  private readonly logger = new Logger(RiskEngineService.name)

  constructor(
    @InjectRepository(AuditLog)      private readonly auditLogs:     Repository<AuditLog>,
    @InjectRepository(LoginAttempt)  private readonly loginAttempts: Repository<LoginAttempt>,
  ) {}

  async assessLoginRisk(userId: string, ip: string): Promise<RiskAssessment> {
    const [ipFailureCount, accountRecentLockout, recentTokenReuse] = await Promise.all([
      this.getIpFailureCount(ip),
      this.hadRecentLockout(userId),
      this.hadRecentTokenReuse(userId),
    ])

    let score = 0
    if (ipFailureCount >= 15)      score += 30
    else if (ipFailureCount >= 10) score += 20
    else if (ipFailureCount >= 5)  score += 10
    if (accountRecentLockout) score += 20
    if (recentTokenReuse)     score += 50
    score = Math.min(score, 100)

    const level: RiskLevel =
      score >= THRESHOLDS.critical ? 'critical'
      : score >= THRESHOLDS.high   ? 'high'
      : score >= THRESHOLDS.medium ? 'medium'
      : 'low'

    const assessment: RiskAssessment = {
      score,
      level,
      signals: { ipFailureCount, accountRecentLockout, recentTokenReuse },
    }

    if (level !== 'low') {
      this.logger.warn(
        `[RiskEngine] ${level.toUpperCase()} score=${score} userId=${userId} ip=${ip} signals=${JSON.stringify(assessment.signals)}`,
      )
    }

    return assessment
  }

  /** Conta falhas de login para este IP na tabela login_attempts (cross-account) */
  private async getIpFailureCount(ip: string): Promise<number> {
    if (!ip || ip === 'unknown') return 0
    try {
      // A tabela login_attempts é keyed por email, não por IP.
      // Usamos os audit_logs para cruzar falhas por IP.
      const since = new Date(Date.now() - 60 * 60 * 1000) // última hora
      return this.auditLogs.count({
        where: { action: 'LOGIN_FAILED', ip, createdAt: MoreThan(since) },
      })
    } catch {
      return 0 // fail open — não bloquear login por erro de DB
    }
  }

  private async hadRecentLockout(userId: string): Promise<boolean> {
    if (!userId) return false
    try {
      const since = new Date(Date.now() - 60 * 60 * 1000)
      const count = await this.auditLogs.count({
        where: { userId, action: 'LOGIN_RATE_LIMITED', createdAt: MoreThan(since) },
      })
      return count > 0
    } catch {
      return false
    }
  }

  private async hadRecentTokenReuse(userId: string): Promise<boolean> {
    if (!userId) return false
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const count = await this.auditLogs.count({
        where: { userId, action: 'REFRESH_REPLAY_DETECTED', createdAt: MoreThan(since) },
      })
      return count > 0
    } catch {
      return false
    }
  }
}
