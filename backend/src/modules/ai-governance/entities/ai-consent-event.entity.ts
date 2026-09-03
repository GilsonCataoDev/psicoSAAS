import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'
import { encryptedTextTransformer } from '../../../common/crypto/encrypt.util'

export type AiConsentScope = 'clinical_ai_processing' | 'session_recording_transcription' | 'neuropsych_ai'

@Entity('ai_consent_events')
@Index(['psychologistId', 'scope', 'patientId', 'createdAt'])
export class AiConsentEvent {
  @PrimaryGeneratedColumn('uuid') id: string
  @Column() psychologistId: string
  @Column({ type: 'text' }) scope: AiConsentScope
  @Column({ type: 'uuid', nullable: true }) patientId?: string | null
  @Column({ type: 'text' }) action: 'accepted' | 'revoked'
  @Column({ type: 'text' }) textVersion: string
  @Column({ type: 'text' }) textSnapshot: string
  @Column({ type: 'text' }) source: string
  @Column({ type: 'text', nullable: true, transformer: encryptedTextTransformer }) ip?: string | null
  @Column({ type: 'text', nullable: true, transformer: encryptedTextTransformer }) userAgent?: string | null
  @CreateDateColumn() createdAt: Date
}
