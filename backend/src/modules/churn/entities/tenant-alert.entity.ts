import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

export type AlertType =
  | 'score_dropped'
  | 'no_login_7d'
  | 'no_login_21d'
  | 'lost_healthy_status'
  | 'not_activated_7d'
  | 'critical_risk'

@Entity('tenant_alerts')
export class TenantAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Index()
  @Column({ type: 'uuid' })
  userId: string

  @Index()
  @Column({ type: 'varchar', length: 64 })
  type: AlertType

  @Column({ type: 'text' })
  message: string

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null

  @Index()
  @Column({ default: false })
  resolved: boolean

  @Column({ type: 'timestamptz', nullable: true })
  resolvedAt: Date | null

  @CreateDateColumn()
  createdAt: Date
}
