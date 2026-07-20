import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany,
  PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn,
} from 'typeorm'
import { User } from '../../auth/entities/user.entity'
import { Patient } from '../../patients/entities/patient.entity'
import { NeuropsychBatteryItem } from './neuropsych-battery-item.entity'

export const NEUROPSYCH_DOMAINS = [
  'intelligence',
  'attention',
  'memory',
  'executive_functions',
  'language',
  'visuospatial_skills',
  'behavioral_scales',
  'personality',
] as const

export type NeuropsychDomain = typeof NEUROPSYCH_DOMAINS[number]
export type NeuropsychAssessmentStatus = 'planning' | 'in_progress' | 'integration' | 'completed' | 'archived'

@Entity('neuropsych_assessments')
export class NeuropsychAssessment {
  @PrimaryGeneratedColumn('uuid') id: string

  @Column() psychologistId: string
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'psychologistId' }) psychologist: User

  @Column() patientId: string
  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' }) patient: Patient

  @Column({ type: 'text', default: 'planning' }) status: NeuropsychAssessmentStatus

  /** Campos clínicos são criptografados pelo serviço antes da persistência. */
  @Column({ type: 'text', nullable: true }) referralQuestion?: string
  @Column({ type: 'text', nullable: true }) clinicalHistory?: string
  @Column({ type: 'text', nullable: true }) clinicalHypotheses?: string
  @Column({ type: 'text', nullable: true }) qualitativeObservations?: string
  @Column({ type: 'text', nullable: true }) integrationDraft?: string
  @Column({ type: 'text', nullable: true }) professionalConclusion?: string

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  evaluatedDomains: NeuropsychDomain[]

  @Column({ type: 'date' }) startedAt: string
  @Column({ type: 'date', nullable: true }) targetCompletionDate?: string
  @Column({ type: 'timestamptz', nullable: true }) completedAt?: Date

  @VersionColumn() version: number
  @CreateDateColumn() createdAt: Date
  @UpdateDateColumn() updatedAt: Date

  @OneToMany(() => NeuropsychBatteryItem, item => item.assessment)
  batteryItems: NeuropsychBatteryItem[]
}
