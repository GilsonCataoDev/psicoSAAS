import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('billing_webhook_events')
export class WebhookEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', unique: true })
  eventId: string

  @Column({ type: 'varchar' })
  eventType: string

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>

  @CreateDateColumn({ type: 'timestamptz' })
  processedAt: Date
}
