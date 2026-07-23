import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Prospect, ProspectConfidence } from './prospect.entity'

export type SignalType =
  | 'whatsapp_scheduling'
  | 'ask_for_hours'
  | 'contact_to_schedule'
  | 'no_online_agenda'
  | 'no_patient_portal'
  | 'public_free_email'
  | 'apparently_autonomous'
  | 'updated_content'
  | 'private_practice'
  | 'manual_process_text'
  | 'psymeet_profile'
  | 'linkedin_autonomous_snippet'
  | 'patient_portal_found'
  | 'known_management_system'
  | 'integrated_online_agenda'
  | 'large_clinic'
  | 'inactive_site'
  | 'no_professional_contact'
  | 'ambiguous_result'

@Entity('prospect_signals')
export class ProspectSignal {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Index()
  @Column({ type: 'uuid' })
  prospectId: string

  @ManyToOne(() => Prospect, prospect => prospect.signals, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'prospectId' })
  prospect?: Prospect

  @Column({ type: 'varchar', length: 64 })
  type: SignalType

  @Column({ type: 'integer' })
  points: number

  @Column({ type: 'varchar', length: 16, default: 'low' })
  confidence: ProspectConfidence

  /** Trecho curto de evidência pública — nunca conteúdo clínico ou dado sensível. */
  @Column({ type: 'text' })
  evidence: string

  @Column({ type: 'varchar', length: 500, nullable: true })
  evidenceUrl: string | null

  @Column({ type: 'varchar', length: 64 })
  detector: string

  @Column({ type: 'timestamptz', default: () => 'now()' })
  detectedAt: Date
}
