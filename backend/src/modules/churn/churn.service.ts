import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { TenantHealth, RiskLevel, Recommendation, ScoreBreakdown } from './entities/tenant-health.entity'
import { TenantActivation } from './entities/tenant-activation.entity'
import { TenantAlert, AlertType } from './entities/tenant-alert.entity'
import { EmailService } from '../email/email.service'
import { AiService } from '../sessions/ai.service'
import { safeDecrypt } from '../../common/crypto/encrypt.util'

// ─── Score weights — single source of truth, easy to adjust ──────────────────
const WEIGHTS = {
  positive: {
    patientPer: 10,   maxPatients: 3,    // up to 30 pts
    sessionPer: 8,    maxSessions: 4,    // up to 32 pts
    appointmentPer: 5, maxAppoints: 4,   // up to 20 pts
    whatsappBonus: 5,                    // flat 5 pts if sent any
    loginDayPer: 2,   maxLoginDays: 7,   // up to 14 pts
  },
  negative: {
    noPatients: -15,
    noLogin7d: -20,
    noRecords14d: -30,
    noActivity21d: -40,
  },
} as const

const RISK_THRESHOLDS = { LOW: 70, MEDIUM: 50, HIGH: 30 } as const

// ─── Raw row from aggregation query ──────────────────────────────────────────
interface TenantStatsRow {
  id: string
  name: string
  email: string
  phone: string | null
  createdAt: Date
  lastActiveAt: Date | null
  plan: string | null
  subscriptionStatus: string | null
  patientCount: string
  sessionCount: string
  sessionCountLast30d: string
  appointmentCount: string
  appointmentCountLast30d: string
  hasWhatsappReminder: boolean
  activeDaysLast14: string
  firstPatientAt: Date | null
  firstSessionAt: Date | null
  firstAppointmentAt: Date | null
}

export interface ChurnRiskResult {
  riskLevel: RiskLevel
  score: number
  reasons: string[]
  recommendations: Recommendation[]
  scoreBreakdown: ScoreBreakdown
  patientCount: number
  sessionCount: number
  daysSinceLastActive: number | null
}

export interface BehaviorTimeline {
  signupAt: Date
  firstLoginAt: Date | null
  firstPatientAt: Date | null
  firstSessionAt: Date | null
  firstAppointmentAt: Date | null
  lastActiveAt: Date | null
  daysSinceSignup: number
  daysSinceLastActive: number | null
}

@Injectable()
export class ChurnService {
  private readonly logger = new Logger(ChurnService.name)

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    @InjectRepository(TenantHealth) private readonly healthRepo: Repository<TenantHealth>,
    @InjectRepository(TenantActivation) private readonly activationRepo: Repository<TenantActivation>,
    @InjectRepository(TenantAlert) private readonly alertRepo: Repository<TenantAlert>,
    private readonly email: EmailService,
    private readonly ai: AiService,
  ) {}

  // ─── Public API ─────────────────────────────────────────────────────────────

  async getDashboard(filters: {
    riskLevel?: RiskLevel
    plan?: string
    days?: number
  } = {}) {
    const rows = await this.fetchAllStats(filters)
    const scored = rows
      .map(r => this.scoreRow(r))
      .filter(account => !filters.riskLevel || account.riskLevel === filters.riskLevel)

    const total = scored.length
    const healthy = scored.filter(s => s.score >= 70).length
    const atRisk = scored.filter(s => s.score >= 40 && s.score < 70).length
    const critical = scored.filter(s => s.score < 40).length

    const activations = await this.activationRepo.find({ where: { activated: true } })
    const activationRate = total > 0 ? Math.round((activations.length / total) * 100) : 0

    const pendingAlertRows = await this.ds.query<Array<{ count: string }>>(`
      SELECT COUNT(*)::int AS count FROM (
        SELECT DISTINCT a."userId", a.type
        FROM tenant_alerts a
        INNER JOIN users u ON u.id = a."userId"
        WHERE a.resolved = false AND u."isActive" = true
          AND u.email NOT ILIKE '%@example.com'
          AND u.email NOT ILIKE '%+test%'
          AND u.name NOT ILIKE '%e2e%'
      ) pending
    `)
    const pendingAlerts = Number(pendingAlertRows[0]?.count ?? 0)

    return {
      summary: { total, healthy, atRisk, critical, activationRate, pendingAlerts },
      accounts: scored.sort((a, b) => a.score - b.score), // highest risk first
      generatedAt: new Date().toISOString(),
    }
  }

  async calculateChurnRisk(userId: string): Promise<ChurnRiskResult> {
    const rows = await this.fetchAllStats({ userId })
    if (!rows.length) {
      return {
        riskLevel: 'CRITICAL', score: 0, reasons: ['Usuário não encontrado'], recommendations: [],
        scoreBreakdown: { patients: 0, sessions: 0, appointments: 0, whatsapp: 0, recency: 0, penalties: 0 },
        patientCount: 0, sessionCount: 0, daysSinceLastActive: null,
      }
    }
    return this.scoreRow(rows[0])
  }

  async checkActivation(userId: string): Promise<TenantActivation> {
    const rows = await this.fetchAllStats({ userId })
    if (!rows.length) throw new Error(`User ${userId} not found`)
    const row = rows[0]

    const patients = Number(row.patientCount)
    const sessions = Number(row.sessionCount)
    const appointments = Number(row.appointmentCount)

    // Condition A: 1+ patient AND 1+ session AND 1+ appointment
    const condA = patients >= 1 && sessions >= 1 && appointments >= 1
    // Condition B: 3+ patients
    const condB = patients >= 3
    const isActivated = condA || condB

    let activation = await this.activationRepo.findOne({ where: { userId } })
    if (!activation) {
      activation = this.activationRepo.create({ userId })
    }

    const wasActivated = activation.activated
    activation.patientCount = patients
    activation.sessionCount = sessions
    activation.appointmentCount = appointments
    activation.activated = isActivated
    if (isActivated && !wasActivated) {
      activation.activatedAt = new Date()
    }

    // Flag needs-onboarding after 7 days without activation
    const daysSinceSignup = this.daysSince(row.createdAt)
    if (!isActivated && daysSinceSignup >= 7 && !activation.needsOnboarding) {
      activation.needsOnboarding = true
      activation.needsOnboardingAt = new Date()
      await this.createAlert(userId, 'not_activated_7d',
        `${row.name} não se ativou após ${daysSinceSignup} dias do cadastro.`,
        { daysSinceSignup })
    }

    return this.activationRepo.save(activation)
  }

  async getBehaviorTimeline(userId: string): Promise<BehaviorTimeline> {
    const rows = await this.fetchAllStats({ userId })
    if (!rows.length) throw new Error(`User ${userId} not found`)
    const row = rows[0]

    return {
      signupAt: row.createdAt,
      firstLoginAt: row.createdAt, // createdAt ≈ first login for existing system
      firstPatientAt: row.firstPatientAt,
      firstSessionAt: row.firstSessionAt,
      firstAppointmentAt: row.firstAppointmentAt,
      lastActiveAt: row.lastActiveAt,
      daysSinceSignup: this.daysSince(row.createdAt),
      daysSinceLastActive: row.lastActiveAt ? this.daysSince(row.lastActiveAt) : null,
    }
  }

  async getAlerts(filters: { userId?: string; resolved?: boolean } = {}) {
    const qb = this.alertRepo.createQueryBuilder('alert')
      .innerJoin('users', 'user', 'user.id = alert."userId"')
      .distinctOn(['alert."userId"', 'alert.type'])
      .where('user."isActive" = true')
      .andWhere("user.email NOT ILIKE '%@example.com'")
      .andWhere("user.email NOT ILIKE '%+test%'")
      .andWhere("user.name NOT ILIKE '%e2e%'")
    if (filters.userId) qb.andWhere('alert."userId" = :userId', { userId: filters.userId })
    if (filters.resolved !== undefined) qb.andWhere('alert.resolved = :resolved', { resolved: filters.resolved })
    return qb.orderBy('alert."userId"').addOrderBy('alert.type').addOrderBy('alert."createdAt"', 'DESC').take(100).getMany()
  }

  async resolveAlert(alertId: string) {
    await this.alertRepo.update(alertId, { resolved: true, resolvedAt: new Date() })
  }

  // ─── Core: recalculate all scores (called by job) ───────────────────────────

  async recalculateAll(): Promise<{ processed: number; errors: number }> {
    const rows = await this.fetchAllStats()
    let processed = 0
    let errors = 0

    for (const row of rows) {
      try {
        await this.persistScore(row)
        await this.checkActivation(row.id)
        processed++
      } catch (err: any) {
        this.logger.error(`Score calc failed for ${row.id}: ${err?.message}`)
        errors++
      }
    }

    this.logger.log(`recalculateAll: processed=${processed} errors=${errors}`)
    return { processed, errors }
  }

  // ─── Analytics ──────────────────────────────────────────────────────────────

  async getAnalytics() {
    const [total, activated7d, activated30d, riskCounts] = await Promise.all([
      this.ds.query<[{ count: string }]>(`SELECT COUNT(*)::int as count FROM users WHERE "isActive" = true AND email NOT ILIKE '%@example.com' AND email NOT ILIKE '%+test%' AND name NOT ILIKE '%e2e%'`),
      this.ds.query<[{ count: string }]>(`
        SELECT COUNT(*)::int as count FROM tenant_activations ta INNER JOIN users u ON u.id = ta."userId"
        WHERE ta.activated = true AND ta."activatedAt" > NOW() - INTERVAL '7 days'
          AND u."isActive" = true AND u.email NOT ILIKE '%@example.com' AND u.email NOT ILIKE '%+test%' AND u.name NOT ILIKE '%e2e%'
      `),
      this.ds.query<[{ count: string }]>(`
        SELECT COUNT(*)::int as count FROM tenant_activations ta INNER JOIN users u ON u.id = ta."userId"
        WHERE ta.activated = true AND ta."activatedAt" > NOW() - INTERVAL '30 days'
          AND u."isActive" = true AND u.email NOT ILIKE '%@example.com' AND u.email NOT ILIKE '%+test%' AND u.name NOT ILIKE '%e2e%'
      `),
      this.ds.query<Array<{ riskLevel: string; count: string }>>(`
        SELECT th."riskLevel", COUNT(*)::int as count FROM tenant_health th
        INNER JOIN users u ON u.id = th."userId"
        WHERE u."isActive" = true AND u.email NOT ILIKE '%@example.com' AND u.email NOT ILIKE '%+test%' AND u.name NOT ILIKE '%e2e%'
        GROUP BY th."riskLevel"
      `),
    ])

    const riskMap = Object.fromEntries(riskCounts.map(r => [r.riskLevel, Number(r.count)]))

    return {
      totalAccounts: Number(total[0]?.count ?? 0),
      activation7d: Number(activated7d[0]?.count ?? 0),
      activation30d: Number(activated30d[0]?.count ?? 0),
      riskDistribution: {
        LOW: riskMap['LOW'] ?? 0,
        MEDIUM: riskMap['MEDIUM'] ?? 0,
        HIGH: riskMap['HIGH'] ?? 0,
        CRITICAL: riskMap['CRITICAL'] ?? 0,
      },
    }
  }

  // ─── AI Diagnostic (optional, architecture-ready) ───────────────────────────

  async aiDiagnose(input: {
    daysWithoutLogin: number
    patients: number
    sessions: number
    appointments: number
    score: number
  }): Promise<{ riskLevel: RiskLevel; explanation: string; recommendations: Recommendation[] }> {
    const risk = this.scoreToRiskLevel(input.score)
    const reasons = this.buildReasons(input.daysWithoutLogin, input.patients, input.sessions, input.appointments)
    const recs = this.buildRecommendations(input.patients, input.sessions, input.appointments, input.daysWithoutLogin)

    let explanation = reasons.join('. ') || 'Usuário com boa atividade.'
    try {
      const ai = await this.ai.generateChurnDiagnosis({ ...input, reasons })
      if (ai.text) explanation = ai.text
    } catch (err: any) {
      this.logger.warn(`Diagnóstico por IA indisponível, usando explicação por regras: ${err?.message ?? 'erro desconhecido'}`)
    }

    return {
      riskLevel: risk,
      explanation,
      recommendations: recs,
    }
  }

  // ─── Internal scoring logic ──────────────────────────────────────────────────

  private scoreRow(row: TenantStatsRow): ChurnRiskResult & {
    id: string; name: string; email: string; phone: string | null; plan: string | null
    subscriptionStatus: string | null; lastActiveAt: Date | null; createdAt: Date
    daysSinceLastActive: number | null; patientCount: number; sessionCount: number
    tier: 'green' | 'yellow' | 'red'
  } {
    const patients = Number(row.patientCount)
    const sessions = Number(row.sessionCountLast30d)
    const appointments = Number(row.appointmentCountLast30d)
    const activeDays = Number(row.activeDaysLast14)
    const daysSinceActive = row.lastActiveAt ? this.daysSince(row.lastActiveAt) : this.daysSince(row.createdAt)

    // ── Positive points ──
    const patientPts = Math.min(patients, WEIGHTS.positive.maxPatients) * WEIGHTS.positive.patientPer
    const sessionPts = Math.min(sessions, WEIGHTS.positive.maxSessions) * WEIGHTS.positive.sessionPer
    const apptPts = Math.min(appointments, WEIGHTS.positive.maxAppoints) * WEIGHTS.positive.appointmentPer
    const wappPts = row.hasWhatsappReminder ? WEIGHTS.positive.whatsappBonus : 0
    const loginPts = Math.min(activeDays, WEIGHTS.positive.maxLoginDays) * WEIGHTS.positive.loginDayPer

    // ── Negative penalties ──
    let penalties = 0
    if (patients === 0) penalties += WEIGHTS.negative.noPatients
    if (daysSinceActive >= 7) penalties += WEIGHTS.negative.noLogin7d
    if (Number(row.sessionCount) === 0 && this.daysSince(row.createdAt) >= 14) penalties += WEIGHTS.negative.noRecords14d
    if (daysSinceActive >= 21) penalties += WEIGHTS.negative.noActivity21d

    const raw = patientPts + sessionPts + apptPts + wappPts + loginPts + penalties
    const score = Math.max(0, Math.min(100, raw))

    const breakdown: ScoreBreakdown = {
      patients: patientPts,
      sessions: sessionPts,
      appointments: apptPts,
      whatsapp: wappPts,
      recency: loginPts,
      penalties,
    }

    const reasons = this.buildReasons(daysSinceActive, patients, Number(row.sessionCount), Number(row.appointmentCount))
    const recommendations = this.buildRecommendations(patients, Number(row.sessionCount), Number(row.appointmentCount), daysSinceActive)
    const riskLevel = this.scoreToRiskLevel(score)

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      // Consultas via DataSource ignoram transformers do TypeORM; decifra o campo
      // antes de enviá-lo ao painel e ao fluxo de contato por WhatsApp.
      phone: safeDecrypt(row.phone) ?? null,
      plan: row.plan,
      subscriptionStatus: row.subscriptionStatus,
      lastActiveAt: row.lastActiveAt,
      createdAt: row.createdAt,
      daysSinceLastActive: daysSinceActive,
      patientCount: patients,
      sessionCount: Number(row.sessionCount),
      score,
      riskLevel,
      tier: score >= 70 ? 'green' : score >= 40 ? 'yellow' : 'red',
      reasons,
      recommendations,
      scoreBreakdown: breakdown,
    }
  }

  private scoreToRiskLevel(score: number): RiskLevel {
    if (score >= RISK_THRESHOLDS.LOW) return 'LOW'
    if (score >= RISK_THRESHOLDS.MEDIUM) return 'MEDIUM'
    if (score >= RISK_THRESHOLDS.HIGH) return 'HIGH'
    return 'CRITICAL'
  }

  private buildReasons(daysSinceActive: number, patients: number, sessions: number, appointments: number): string[] {
    const reasons: string[] = []
    if (daysSinceActive >= 21) reasons.push(`Sem acesso por ${daysSinceActive} dias`)
    else if (daysSinceActive >= 7) reasons.push(`Sem login há ${daysSinceActive} dias`)
    if (patients === 0) reasons.push('Nenhum paciente cadastrado')
    if (sessions === 0) reasons.push('Nenhuma sessão registrada')
    if (appointments === 0) reasons.push('Agenda não utilizada')
    return reasons
  }

  private buildRecommendations(patients: number, sessions: number, appointments: number, daysSinceActive: number): Recommendation[] {
    const recs: Recommendation[] = []
    if (patients === 0) {
      recs.push({ action: 'add_first_patient', label: 'Cadastrar primeiros pacientes', impact: 'high', priority: 1 })
    }
    if (sessions === 0 && patients > 0) {
      recs.push({ action: 'add_first_record', label: 'Criar primeiro prontuário', impact: 'high', priority: 2 })
    }
    if (appointments === 0) {
      recs.push({ action: 'setup_agenda', label: 'Configurar agenda', impact: 'medium', priority: 3 })
    }
    if (daysSinceActive >= 7) {
      recs.push({ action: 'reactivation_email', label: 'Enviar e-mail de reativação', impact: 'high', priority: 1 })
    }
    return recs.sort((a, b) => a.priority - b.priority)
  }

  private async persistScore(row: TenantStatsRow): Promise<void> {
    const scored = this.scoreRow(row)

    let health = await this.healthRepo.findOne({ where: { userId: row.id } })
    const previousScore = health?.score ?? null

    if (!health) health = this.healthRepo.create({ userId: row.id })

    health.score = scored.score
    health.riskLevel = scored.riskLevel
    health.scoreBreakdown = scored.scoreBreakdown
    health.reasons = scored.reasons
    health.recommendations = scored.recommendations
    health.previousScore = previousScore
    health.lastCalculatedAt = new Date()

    await this.healthRepo.save(health)

    // Generate alerts based on score changes
    if (previousScore !== null) {
      await this.generateAlerts(row.id, row.name, scored.score, previousScore, scored.riskLevel)
    }
  }

  private async generateAlerts(userId: string, name: string, score: number, previousScore: number, riskLevel: RiskLevel): Promise<void> {
    const drop = previousScore - score
    const wasHealthy = previousScore >= 70
    const isNowUnhealthy = score < 70
    const daysSinceActive = await this.getUserDaysSinceActive(userId)

    if (drop >= 30) {
      await this.createAlertIfNew(userId, 'score_dropped',
        `Health score de ${name} caiu ${drop} pontos (${previousScore} → ${score}).`,
        { previousScore, currentScore: score, drop })
    }
    if (daysSinceActive !== null && daysSinceActive >= 7) {
      await this.createAlertIfNew(userId, 'no_login_7d',
        `${name} está sem login há ${daysSinceActive} dias.`,
        { daysSinceActive })
    }
    if (wasHealthy && isNowUnhealthy) {
      await this.createAlertIfNew(userId, 'lost_healthy_status',
        `${name} perdeu o status saudável (score: ${score}).`,
        { score })
    }
    if (riskLevel === 'CRITICAL') {
      await this.createAlertIfNew(userId, 'critical_risk',
        `${name} está em risco crítico (score: ${score}).`,
        { score })
    }
  }

  private async createAlertIfNew(userId: string, type: AlertType, message: string, metadata: Record<string, unknown>): Promise<void> {
    // Avoid duplicate unresolved alerts of the same type
    const existing = await this.alertRepo.findOne({ where: { userId, type, resolved: false } })
    if (existing) return
    await this.createAlert(userId, type, message, metadata)
  }

  private async createAlert(userId: string, type: AlertType, message: string, metadata: Record<string, unknown>): Promise<void> {
    await this.alertRepo.save(this.alertRepo.create({ userId, type, message, metadata }))
  }

  private async getUserDaysSinceActive(userId: string): Promise<number | null> {
    const rows = await this.ds.query<Array<{ lastActiveAt: Date | null }>>(
      `SELECT "lastActiveAt" FROM users WHERE id = $1 LIMIT 1`, [userId],
    )
    if (!rows.length || !rows[0].lastActiveAt) return null
    return this.daysSince(rows[0].lastActiveAt)
  }

  // ─── Data fetching ───────────────────────────────────────────────────────────

  private async fetchAllStats(filters: { userId?: string; riskLevel?: RiskLevel; plan?: string; days?: number } = {}): Promise<TenantStatsRow[]> {
    const params: unknown[] = []
    const conditions: string[] = [
      `u."isActive" = true`,
      `u.email NOT ILIKE '%@example.com'`,
      `u.email NOT ILIKE '%+test%'`,
      `u.name NOT ILIKE '%e2e%'`,
    ]

    if (filters.userId) {
      params.push(filters.userId)
      conditions.push(`u.id = $${params.length}`)
    }
    if (filters.plan) {
      params.push(filters.plan)
      conditions.push(`sub.plan = $${params.length}`)
    }
    if (filters.days) {
      params.push(filters.days)
      conditions.push(`u."createdAt" > NOW() - ($${params.length} || ' days')::interval`)
    }

    const where = conditions.join(' AND ')

    return this.ds.query<TenantStatsRow[]>(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.phone,
        u."createdAt",
        u."lastActiveAt",
        sub.plan,
        sub.status AS "subscriptionStatus",
        (SELECT COUNT(*)::int FROM patients p WHERE p."psychologistId" = u.id) AS "patientCount",
        (SELECT COUNT(*)::int FROM sessions s WHERE s."psychologistId" = u.id) AS "sessionCount",
        (SELECT COUNT(*)::int FROM sessions s WHERE s."psychologistId" = u.id AND s."createdAt" > NOW() - INTERVAL '30 days') AS "sessionCountLast30d",
        (SELECT COUNT(*)::int FROM appointments a WHERE a."psychologistId" = u.id) AS "appointmentCount",
        (SELECT COUNT(*)::int FROM appointments a WHERE a."psychologistId" = u.id AND a."createdAt" > NOW() - INTERVAL '30 days') AS "appointmentCountLast30d",
        (SELECT EXISTS(
          SELECT 1 FROM appointments a WHERE a."psychologistId" = u.id
          AND (a."reminder24hSentAt" IS NOT NULL OR a."reminder2hSentAt" IS NOT NULL)
          AND a."createdAt" > NOW() - INTERVAL '30 days'
        )) AS "hasWhatsappReminder",
        (SELECT COUNT(DISTINCT DATE("lastActiveAt"))::int FROM users u2
          WHERE u2.id = u.id AND u2."lastActiveAt" > NOW() - INTERVAL '14 days') AS "activeDaysLast14",
        (SELECT MIN(p."createdAt") FROM patients p WHERE p."psychologistId" = u.id) AS "firstPatientAt",
        (SELECT MIN(s."createdAt") FROM sessions s WHERE s."psychologistId" = u.id) AS "firstSessionAt",
        (SELECT MIN(a."createdAt") FROM appointments a WHERE a."psychologistId" = u.id) AS "firstAppointmentAt"
      FROM users u
      LEFT JOIN LATERAL (
        SELECT s.plan, s.status FROM billing_subscriptions s WHERE s."userId" = u.id
        ORDER BY s."createdAt" DESC LIMIT 1
      ) sub ON TRUE
      WHERE ${where}
      ORDER BY u."lastActiveAt" DESC NULLS LAST
      LIMIT 500
    `, params)
  }

  // ─── Automated email nudges ─────────────────────────────────────────────────

  async sendActivationNudges(): Promise<{ sent48h: number; sent7d: number; sent21d: number }> {
    const rows = await this.ds.query<Array<{
      id: string; name: string; email: string; daysSinceSignup: number; patientCount: string
    }>>(`
      SELECT
        u.id, u.name, u.email,
        FLOOR(EXTRACT(EPOCH FROM (NOW() - u."createdAt")) / 86400)::int AS "daysSinceSignup",
        (SELECT COUNT(*)::int FROM patients p WHERE p."psychologistId" = u.id) AS "patientCount"
      FROM users u
      WHERE u."isActive" = true
        AND u.email NOT LIKE '%@example.com'
        AND u.email NOT LIKE '%+test%'
      ORDER BY u."createdAt" DESC
      LIMIT 500
    `)

    let sent48h = 0, sent7d = 0, sent21d = 0

    for (const row of rows) {
      const patients = Number(row.patientCount)
      const days = row.daysSinceSignup

      // 48h nudge — not activated, between 2-3 days old
      if (patients === 0 && days >= 2 && days < 3) {
        const already = await this.alertRepo.findOne({ where: { userId: row.id, type: 'activation_email_48h' } })
        if (!already) {
          await this.sendNudgeEmail(row.name, row.email, '48h')
          await this.createAlert(row.id, 'activation_email_48h', `E-mail de ativação 48h enviado.`, {})
          sent48h++
        }
      }

      // 7d nudge — still not activated, between 7-8 days old
      if (patients === 0 && days >= 7 && days < 8) {
        const already = await this.alertRepo.findOne({ where: { userId: row.id, type: 'activation_email_7d' } })
        if (!already) {
          await this.sendNudgeEmail(row.name, row.email, '7d')
          await this.createAlert(row.id, 'activation_email_7d', `E-mail de ativação 7d enviado.`, {})
          sent7d++
        }
      }

      // 21d reactivation — had patients but stopped using (no session in 21d)
      if (patients > 0 && days >= 21) {
        const lastSession = await this.ds.query<Array<{ lastSession: Date | null }>>(
          `SELECT MAX(s."createdAt") AS "lastSession" FROM sessions s WHERE s."psychologistId" = $1`, [row.id],
        )
        const daysSinceSession = lastSession[0]?.lastSession
          ? this.daysSince(lastSession[0].lastSession)
          : days
        if (daysSinceSession >= 21) {
          const already = await this.alertRepo.findOne({ where: { userId: row.id, type: 'reactivation_email_21d', resolved: false } })
          if (!already) {
            await this.sendNudgeEmail(row.name, row.email, '21d')
            await this.createAlert(row.id, 'reactivation_email_21d', `E-mail de reativação 21d enviado.`, {})
            sent21d++
          }
        }
      }
    }

    this.logger.log(`nudges: 48h=${sent48h} 7d=${sent7d} 21d=${sent21d}`)
    return { sent48h, sent7d, sent21d }
  }

  private async sendNudgeEmail(name: string, email: string, type: '48h' | '7d' | '21d'): Promise<void> {
    const url = 'https://usecognia.com.br/pacientes'
    const cta = `<a href="${url}" style="display:inline-block;background:#2f7657;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px">Cadastrar meu primeiro paciente →</a>`

    const subjects: Record<string, string> = {
      '48h': `${name}, seu consultório digital está esperando por você 👋`,
      '7d':  `Uma semana no UseCognia — mas você ainda não começou, ${name}`,
      '21d': `${name}, seus pacientes estão esperando no UseCognia`,
    }

    const bodies: Record<string, string> = {
      '48h': `
        <p>Olá, <strong>${name}</strong>!</p>
        <p>Você criou sua conta no UseCognia há dois dias. Que ótimo ter você aqui! 🎉</p>
        <p>O primeiro passo é simples: <strong>cadastre seu primeiro paciente</strong>. Leva menos de 1 minuto e já libera agendamentos, prontuários e muito mais.</p>
        <p style="margin:32px 0">${cta}</p>
        <p style="color:#666;font-size:13px">Dúvidas? Responda este e-mail que a gente ajuda.</p>
      `,
      '7d': `
        <p>Olá, <strong>${name}</strong>!</p>
        <p>Faz uma semana desde que você criou sua conta — e ainda não cadastrou nenhum paciente. Tudo bem, às vezes o dia a dia não deixa. 😊</p>
        <p>Que tal levar <strong>60 segundos agora</strong> para cadastrar o primeiro paciente? É o único passo que precisa para desbloquear toda a plataforma.</p>
        <p style="margin:32px 0">${cta}</p>
        <p style="color:#666;font-size:13px">Se tiver alguma dificuldade ou dúvida, é só responder este e-mail.</p>
      `,
      '21d': `
        <p>Olá, <strong>${name}</strong>!</p>
        <p>Percebemos que faz mais de 3 semanas sem registrar sessões no UseCognia. Está tudo bem por aí?</p>
        <p>Seus prontuários, agenda e pacientes continuam salvos e seguros. Quando quiser retomar, é só entrar na plataforma.</p>
        <p style="margin:32px 0">
            <a href="https://usecognia.com.br/login" style="display:inline-block;background:#2f7657;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px">Voltar para o UseCognia →</a>
        </p>
        <p style="color:#666;font-size:13px">Se precisar de ajuda ou quiser conversar sobre a plataforma, responda este e-mail.</p>
      `,
    }

    await this.email.send({
      to: email,
      subject: subjects[type],
      html: `
        <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a;line-height:1.6">
          ${bodies[type]}
          <hr style="border:none;border-top:1px solid #eee;margin:32px 0"/>
          <p style="color:#999;font-size:12px">
            Equipe UseCognia · <a href="https://usecognia.com.br" style="color:#999">usecognia.com.br</a><br/>
            Para não receber mais e-mails, responda com "descadastrar".
          </p>
        </div>
      `,
    })
  }

  async sendReactivationEmail(userId: string): Promise<{ sent: boolean }> {
    const rows = await this.ds.query<Array<{ name: string; email: string }>>(
      `SELECT name, email FROM users WHERE id = $1 LIMIT 1`, [userId],
    )
    if (!rows.length) throw new NotFoundException('Usuário não encontrado')
    const { name, email } = rows[0]

    await this.email.send({
      to: email,
      subject: `${name}, sentimos sua falta no UseCognia 💙`,
      html: `
        <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
          <h2 style="color:#2f7657">Olá, ${name}!</h2>
          <p>Percebemos que faz um tempo que você não acessa o UseCognia.</p>
          <p>Sua agenda, prontuários e pacientes estão te esperando. Que tal retomar de onde parou?</p>
          <p style="margin:32px 0">
            <a href="https://usecognia.com.br/login"
               style="background:#2f7657;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600">
              Acessar minha conta →
            </a>
          </p>
          <p style="color:#666;font-size:13px">
            Precisa de ajuda? Responda este e-mail ou fale com a gente pelo WhatsApp.<br/>
            — Equipe UseCognia
          </p>
        </div>
      `,
    })

    this.logger.log(`churn:reactivation-email sent to userId=${userId}`)
    return { sent: true }
  }

  private daysSince(date: Date | string): number {
    return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000)
  }
}
