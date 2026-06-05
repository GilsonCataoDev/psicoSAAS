import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

@Entity('audit_logs')
@Index(['userId', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  userId: string

  @Column()
  action: string

  @Column()
  resource: string

  @Column({ nullable: true })
  resourceId?: string

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>

  @Column({ nullable: true })
  ip?: string

  @Column({ nullable: true })
  userAgent?: string

  @CreateDateColumn()
  createdAt: Date
}
