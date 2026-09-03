import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm'
import { User } from '../../auth/entities/user.entity'
import { Patient } from '../../patients/entities/patient.entity'
import { InstrumentAssignment } from '../../instrument-assignments/entities/instrument-assignment.entity'
import { NeuropsychAssessment, NeuropsychDomain } from './neuropsych-assessment.entity'

export type NeuropsychProcedureType =
  | 'psychological_test'
  | 'neuropsychological_procedure'
  | 'behavioral_scale'
  | 'clinical_interview'
  | 'observation'
  | 'other'

export type NeuropsychBatteryItemStatus = 'planned' | 'applied' | 'integrated' | 'not_applied'

@Entity('neuropsych_battery_items')
export class NeuropsychBatteryItem {
  @PrimaryGeneratedColumn('uuid') id: string

  @Column() assessmentId: string
  @ManyToOne(() => NeuropsychAssessment, assessment => assessment.batteryItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assessmentId' }) assessment: NeuropsychAssessment

  @Column() patientId: string
  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' }) patient: Patient

  @Column() psychologistId: string
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'psychologistId' }) psychologist: User

  @Column({ length: 160 }) name: string
  @Column({ type: 'text' }) procedureType: NeuropsychProcedureType
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" }) domains: NeuropsychDomain[]
  @Column({ type: 'text', default: 'planned' }) status: NeuropsychBatteryItemStatus

  /** Conteúdo produzido pelo profissional; criptografado pelo serviço. */
  @Column({ type: 'text', nullable: true }) purpose?: string
  @Column({ type: 'text', nullable: true }) resultSummary?: string
  @Column({ type: 'text', nullable: true }) qualitativeNotes?: string

  /** Escore numérico opcional (percentil, escore padrão, T-score etc.) — habilita gráfico de evolução. */
  @Column({ type: 'numeric', precision: 7, scale: 2, nullable: true, transformer: {
    to: (value?: number | null) => value ?? null,
    from: (value?: string | null) => value === null || value === undefined ? undefined : Number(value),
  } }) score?: number
  @Column({ length: 80, nullable: true }) scoreType?: string

  @Column({ type: 'date', nullable: true }) plannedDate?: string
  @Column({ type: 'date', nullable: true }) appliedDate?: string
  @Column({ type: 'int', default: 0 }) sortOrder: number

  @Column({ nullable: true }) instrumentAssignmentId?: string
  @ManyToOne(() => InstrumentAssignment, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'instrumentAssignmentId' }) instrumentAssignment?: InstrumentAssignment

  @CreateDateColumn() createdAt: Date
  @UpdateDateColumn() updatedAt: Date
}
