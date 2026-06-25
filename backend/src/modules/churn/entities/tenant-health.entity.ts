import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type HealthTier = 'green' | 'yellow' | 'red'

export interface ScoreBreakdown {
  patients: number
  sessions: number
  appointments: number
  whatsapp: number
  recency: number
  penalties: number
}

export interface Recommendation {
  action: string
  label: string
  impact: 'high' | 'medium' | 'low'
  priority: number
}

@Entity('tenant_health')
export class TenantHealth {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  userId: string

  @Index()
  @Column({ default: 0 })
  score: number

  @Index()
  @Column({ type: 'varchar', length: 16, default: 'CRITICAL' })
  riskLevel: RiskLevel

  @Column({ type: 'jsonb', nullable: true })
  scoreBreakdown: ScoreBreakdown | null

  @Column({ type: 'jsonb', nullable: true })
  reasons: string[] | null

  @Column({ type: 'jsonb', nullable: true })
  recommendations: Recommendation[] | null

  @Column({ nullable: true })
  previousScore: number | null

  @Column({ type: 'timestamptz', default: () => 'now()' })
  lastCalculatedAt: Date

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  get tier(): HealthTier {
    if (this.score >= 70) return 'green'
    if (this.score >= 40) return 'yellow'
    return 'red'
  }
}
