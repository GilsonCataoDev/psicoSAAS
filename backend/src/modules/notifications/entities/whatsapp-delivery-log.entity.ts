import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm'
import { User } from '../../auth/entities/user.entity'

export type WhatsAppDeliveryStatus = 'sent' | 'failed'

@Entity('whatsapp_delivery_logs')
@Index(['userId', 'createdAt'])
export class WhatsAppDeliveryLog {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  userId: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User

  @Column({ type: 'text' })
  type: string

  @Column({ type: 'text', default: 'failed' })
  status: WhatsAppDeliveryStatus

  @Column({ type: 'text', nullable: true })
  patientId?: string | null

  @Column({ type: 'text', nullable: true })
  patientName?: string | null

  @Column({ type: 'text', nullable: true })
  recipientPhone?: string | null

  @Column({ type: 'text', nullable: true })
  error?: string | null

  @Column({ type: 'text', nullable: true })
  providerMessageId?: string | null

  @Column({ type: 'text', nullable: true })
  providerStatus?: string | null

  @Column({ type: 'integer', nullable: true })
  contentLength?: number | null

  @CreateDateColumn()
  createdAt: Date
}
