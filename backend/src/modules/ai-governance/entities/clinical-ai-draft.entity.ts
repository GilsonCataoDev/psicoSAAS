import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { encryptedTextTransformer } from '../../../common/crypto/encrypt.util'

export type ClinicalAiDraftKind = 'session_summary' | 'clinical_note' | 'session_plan'
export type ClinicalAiDraftStatus = 'generated' | 'accepted' | 'discarded'

@Entity('clinical_ai_drafts')
@Index(['psychologistId', 'patientId', 'createdAt'])
export class ClinicalAiDraft {
  @PrimaryGeneratedColumn('uuid') id: string
  @Column() psychologistId: string
  @Column({ type: 'uuid' }) patientId: string
  @Column({ type: 'uuid', nullable: true }) sessionId?: string | null
  @Column({ type: 'text' }) kind: ClinicalAiDraftKind
  @Column({ type: 'text', transformer: encryptedTextTransformer }) content: string
  @Column({ type: 'text' }) sourceHash: string
  @Column({ type: 'text', default: 'generated' }) status: ClinicalAiDraftStatus
  @Column({ type: 'text' }) model: string
  @Column({ type: 'text' }) promptVersion: string
  @Column({ type: 'integer', default: 0 }) inputTokens: number
  @Column({ type: 'integer', default: 0 }) outputTokens: number
  @Column({ type: 'integer', default: 0 }) costUsdMicros: number
  @Column({ type: 'timestamptz', nullable: true }) reviewedAt?: Date | null
  @CreateDateColumn() createdAt: Date
  @UpdateDateColumn() updatedAt: Date
}
