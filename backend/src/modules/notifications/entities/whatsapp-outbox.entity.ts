import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { encryptedTextTransformer } from '../../../common/crypto/encrypt.util'

export type WhatsAppOutboxStatus = 'pending' | 'sending' | 'accepted' | 'delivered' | 'read' | 'failed'

@Entity('whatsapp_outbox')
@Index(['idempotencyKey'], { unique: true })
@Index(['status', 'nextAttemptAt'])
export class WhatsAppOutbox {
  @PrimaryGeneratedColumn('uuid') id: string
  @Column() userId: string
  @Column({ type: 'text' }) idempotencyKey: string
  @Column({ type: 'text' }) type: string
  @Column({ type: 'text', default: 'evolution' }) provider: string
  @Column({ type: 'text', default: 'pending' }) status: WhatsAppOutboxStatus
  @Column({ type: 'text', nullable: true }) patientId?: string | null
  @Column({ type: 'text', transformer: encryptedTextTransformer }) recipientPhone: string
  @Column({ type: 'text', transformer: encryptedTextTransformer }) content: string
  @Column({ type: 'integer', default: 0 }) attempts: number
  @Column({ type: 'timestamptz', nullable: true }) nextAttemptAt?: Date | null
  @Index()
  @Column({ type: 'text', nullable: true }) providerMessageId?: string | null
  @Column({ type: 'text', nullable: true }) providerStatus?: string | null
  @Column({ type: 'text', nullable: true, transformer: encryptedTextTransformer }) lastError?: string | null
  @CreateDateColumn() createdAt: Date
  @UpdateDateColumn() updatedAt: Date
}
