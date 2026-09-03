import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { ProspectConversation } from './prospect-conversation.entity'

export type MessageDirection = 'inbound' | 'outbound'

export type MessageStatus =
  | 'draft'
  | 'awaiting_approval'
  | 'approved'
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'canceled'

@Entity('prospect_messages')
export class ProspectMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Index()
  @Column({ type: 'uuid' })
  conversationId: string

  @ManyToOne(() => ProspectConversation, conversation => conversation.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation?: ProspectConversation

  @Column({ type: 'varchar', length: 16 })
  direction: MessageDirection

  @Index()
  @Column({ type: 'varchar', length: 24, default: 'draft' })
  status: MessageStatus

  @Column({ type: 'text' })
  content: string

  @Column({ type: 'boolean', default: false })
  aiGenerated: boolean

  @Column({ type: 'uuid', nullable: true })
  approvedByUserId: string | null

  @Column({ type: 'timestamptz', nullable: true })
  approvedAt: Date | null

  @Column({ type: 'varchar', length: 255, nullable: true })
  providerMessageId: string | null

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null

  @Column({ type: 'timestamptz', nullable: true })
  sentAt: Date | null

  @Column({ type: 'timestamptz', nullable: true })
  deliveredAt: Date | null

  @CreateDateColumn()
  createdAt: Date
}
