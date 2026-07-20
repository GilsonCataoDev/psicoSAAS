import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { User } from '../../auth/entities/user.entity'
import { Patient } from '../../patients/entities/patient.entity'
import { NeuropsychAssessment } from './neuropsych-assessment.entity'

export type NeuropsychAiAnalysisStatus = 'completed'

@Entity('neuropsych_ai_analyses')
export class NeuropsychAiAnalysis {
  @PrimaryGeneratedColumn('uuid') id: string

  @Column() psychologistId: string
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'psychologistId' }) psychologist: User

  @Column() patientId: string
  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' }) patient: Patient

  @Column() assessmentId: string
  @ManyToOne(() => NeuropsychAssessment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assessmentId' }) assessment: NeuropsychAssessment

  @Column({ type: 'text', default: 'completed' }) status: NeuropsychAiAnalysisStatus

  /** Resposta estruturada da IA (JSON), criptografada pelo serviço antes de persistir. Nunca guardamos o prompt. */
  @Column({ type: 'text' }) response: string

  @Column({ type: 'text' }) promptVersion: string
  @Column({ type: 'text' }) model: string
  @Column({ type: 'int', default: 0 }) inputTokens: number
  @Column({ type: 'int', default: 0 }) outputTokens: number
  @Column({ type: 'int', default: 0 }) costUsdMicros: number

  /** Campos incluídos na análise pelo profissional — auditável sem expor o conteúdo em si. */
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" }) includedFields: string[]

  @CreateDateColumn() createdAt: Date
}
