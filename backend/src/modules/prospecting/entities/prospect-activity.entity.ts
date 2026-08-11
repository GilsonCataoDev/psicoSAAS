import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Prospect } from './prospect.entity'

export type ProspectActivityAction =
  | 'discovered'
  | 'merged_duplicate'
  | 'analyzed'
  | 'approved'
  | 'discarded'
  | 'do_not_contact'
  | 'deleted'
  | 'exported'
  | 'draft_generated'
  | 'reply_suggested'
  | 'status_changed'
  | 'expired'
  | 'analysis_failed'

@Entity('prospect_activities')
export class ProspectActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Index()
  @Column({ type: 'uuid' })
  prospectId: string

  @ManyToOne(() => Prospect, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'prospectId' })
  prospect?: Prospect

  @Column({ type: 'varchar', length: 64 })
  action: ProspectActivityAction

  @Column({ type: 'uuid', nullable: true })
  actorUserId: string | null

  @Column({ type: 'text', nullable: true })
  notes: string | null

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null

  @CreateDateColumn()
  createdAt: Date
}
