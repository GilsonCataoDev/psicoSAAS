import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { Prospect } from './prospect.entity'
import { ProspectMessage } from './prospect-message.entity'

export type ConversationChannel = 'whatsapp' | 'email' | 'instagram' | 'manual'

export type ConversationStatus =
  | 'draft'
  | 'awaiting_approval'
  | 'approved'
  | 'active'
  | 'paused'
  | 'converted'
  | 'opted_out'
  | 'closed'

@Entity('prospect_conversations')
export class ProspectConversation {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Index()
  @Column({ type: 'uuid' })
  prospectId: string

  @ManyToOne(() => Prospect, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'prospectId' })
  prospect?: Prospect

  @Column({ type: 'varchar', length: 16 })
  channel: ConversationChannel

  @Index()
  @Column({ type: 'varchar', length: 24, default: 'draft' })
  status: ConversationStatus

  @Column({ type: 'uuid', nullable: true })
  assignedUserId: string | null

  @Column({ type: 'timestamptz', nullable: true })
  lastInboundAt: Date | null

  @Column({ type: 'timestamptz', nullable: true })
  lastOutboundAt: Date | null

  @Column({ type: 'timestamptz', nullable: true })
  nextFollowUpAt: Date | null

  @Column({ type: 'integer', default: 0 })
  followUpCount: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @OneToMany(() => ProspectMessage, message => message.conversation)
  messages?: ProspectMessage[]
}
