import { Injectable, Logger } from '@nestjs/common'
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { TenantHealth, RiskLevel, Recommendation, ScoreBreakdown } from './entities/tenant-health.entity'
import { TenantActivation } from './entities/tenant-activation.entity'
import { TenantAlert, AlertType } from './entities/tenant-alert.entity'

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
  ) {}

  // ─── Public API ─────────────────────────────────────────────────────────────

  async getDashboard(filters: {
    riskLevel?: RiskLevel
    plan?: string
    days?: number
  } = {}) {
    const rows = await this.fetchAllStats(filters)
    const scored = rows.map(r => this.scoreRow(r))

    const total = scored.length
    const healthy = scored.filter(s => s.score >= 70).length
    const atRisk = scored.filter(s => s.score >= 40 && s.score < 70).length
    const critical = scored.filter(s => s.score < 40).length

    const activations = await this.activationRepo.find({ where: { activated: true } })
    const activationRate = total > 0 ? Math.round((activations.length / total) * 100) : 0

    const pendingAlerts = await this.alertRepo.count({ where: { resolved: false } })

    return {
      summary: { total, healthy, atRisk, critical, activationRate, pendingAlerts },
      accounts: scored.sort((a, b) => a.score - b.score), // highest risk first
      generatedAt: new Date().toISOString(),
    }
  }

  async calculateChurnRisk(userId: string): Promise<ChurnRiskResult> {
    const rows = await this.fetchAllStats({ userId })
    if (!rows.length) {
      return { riskLevel: 'CRITICAL', score: 0, reasons: ['Usuário não encontrado'], recommendations: [] }
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
    const where: Record<string, unknown> = {}
    if (filters.userId) where.userId = filters.userId
    if (filters.resolved !== undefined) where.resolved = filters.resolved
    return this.alertRepo.find({ where, order: { createdAt: 'DESC' }, take: 100 })
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
      this.ds.query<[{ count: string }]>('SELECT COUNT(*)::int as count FROM users WHERE "isActive" = true'),
      this.ds.query<[{ count: string }]>(`
        SELECT COUNT(*)::int as count FROM tenant_activations
        WHERE activated = true AND "activatedAt" > NOW() - INTERVAL '7 days'
      `),
      this.ds.query<[{ count: string }]>(`
        SELECT COUNT(*)::int as count FROM tenant_activations
        WHERE activated = true AND "activatedAt" > NOW() - INTERVAL '30 days'
      `),
      this.ds.query<Array<{ riskLevel: string; count: string }>>(`
        SELECT "riskLevel", COUNT(*)::int as count FROM tenant_health GROUP BY "riskLevel"
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
    // Architecture ready for OpenAI/Claude integration — returns rule-based response for now
    const risk = this.scoreToRiskLevel(input.score)
    const reasons = this.buildReasons(input.daysWithoutLogin, input.patients, input.sessions, input.appointments)
    const recs = this.buildRecommendations(input.patients, input.sessions, input.appointments, input.daysWithoutLogin)

    return {
      riskLevel: risk,
      explanation: reasons.join('. ') || 'Usuário com boa atividade.',
      recommendations: recs,
    }
  }

  // ─── Internal scoring logic ──────────────────────────────────────────────────

  private scoreRow(row: TenantStatsRow): ChurnRiskResult & {
    id: string; name: string; email: string; plan: string | null
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
    const conditions: string[] = [`u."isActive" = true`]

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

  private daysSince(date: Date | string): number {
    return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000)
  }
}
