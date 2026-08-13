import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { ProspectSignal } from './prospect-signal.entity'

export type ProspectStatus =
  | 'discovered'
  | 'analyzing'
  | 'analyzed'
  | 'qualified'
  | 'approved'
  | 'contacted'
  | 'replied'
  | 'interested'
  | 'registered'
  | 'activated'
  | 'discarded'
  | 'do_not_contact'
  | 'expired'
  | 'error'

export type ProspectSourceType = 'own_site' | 'linkedin_search' | 'psymeet_search' | 'directory_search'

export type ProspectConfidence = 'low' | 'medium' | 'high'

/**
 * Base legal registrada para justificar o tratamento — sempre dado profissional
 * publicado publicamente pelo próprio psicólogo. Ver docs/PROSPECTING_PRIVACY_CHECKLIST.md.
 */
@Entity('prospects')
export class Prospect {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  professionalName: string | null

  @Index()
  @Column({ type: 'varchar', length: 120, nullable: true })
  city: string | null

  @Column({ type: 'varchar', length: 2, nullable: true })
  state: string | null

  @Column({ type: 'varchar', length: 500, nullable: true })
  website: string | null

  @Index()
  @Column({ type: 'varchar', length: 255, nullable: true })
  websiteDomain: string | null

  @Index()
  @Column({ type: 'varchar', length: 255, nullable: true })
  professionalEmail: string | null

  @Index()
  @Column({ type: 'varchar', length: 32, nullable: true })
  professionalPhone: string | null

  @Column({ type: 'varchar', length: 500, nullable: true })
  linkedinUrl: string | null

  @Column({ type: 'varchar', length: 500, nullable: true })
  psymeetUrl: string | null

  @Column({ type: 'varchar', length: 500 })
  sourceUrl: string

  @Column({ type: 'varchar', length: 32 })
  sourceType: ProspectSourceType

  @Column({ type: 'varchar', length: 500, nullable: true })
  sourceTitle: string | null

  @Column({ type: 'text', nullable: true })
  sourceSnippet: string | null

  @Index()
  @Column({ type: 'integer', default: 0 })
  score: number

  @Column({ type: 'varchar', length: 16, default: 'low' })
  confidence: ProspectConfidence

  @Index()
  @Column({ type: 'varchar', length: 24, default: 'discovered' })
  status: ProspectStatus

  @Column({ type: 'varchar', length: 64, default: 'legitimate_interest_public_professional_data' })
  privacyBasis: string

  @Column({ type: 'timestamptz', default: () => 'now()' })
  discoveredAt: Date

  @Column({ type: 'timestamptz', nullable: true })
  analyzedAt: Date | null

  @Column({ type: 'timestamptz', nullable: true })
  lastContactAt: Date | null

  @Index({ unique: true })
  @Column({ type: 'uuid', nullable: true })
  linkedUserId: string | null

  @Column({ type: 'timestamptz', nullable: true })
  registeredAt: Date | null

  @Column({ type: 'timestamptz', nullable: true })
  activatedAt: Date | null

  @Index()
  @Column({ type: 'timestamptz' })
  retentionUntil: Date

  @Column({ type: 'boolean', default: false })
  doNotContact: boolean

  @Column({ type: 'timestamptz', nullable: true })
  doNotContactAt: Date | null

  @Column({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null

  /** Hash mínimo (domínio/e-mail) mantido após exclusão para honrar a lista "não contatar". */
  @Column({ type: 'varchar', length: 128, nullable: true })
  residualHash: string | null

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @OneToMany(() => ProspectSignal, signal => signal.prospect)
  signals?: ProspectSignal[]
}
