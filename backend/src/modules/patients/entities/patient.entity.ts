import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn,
} from 'typeorm'
import { User } from '../../auth/entities/user.entity'
import { Session } from '../../sessions/entities/session.entity'
import { Appointment } from '../../appointments/entities/appointment.entity'

export type PatientStatus = 'active' | 'paused' | 'discharged'

@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn('uuid') id: string

  @Column() name: string
  @Column({ nullable: true }) email?: string
  @Column({ nullable: true }) phone?: string
  @Column({ nullable: true }) birthDate?: string
  @Column({ nullable: true }) pronouns?: string

  @Column({ type: 'text', default: 'active' })
  status: PatientStatus

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  sessionPrice: number

  @Column({ default: 50 }) sessionDuration: number
  @Column({ nullable: true }) startDate?: string
  @Column({ nullable: true }) avatarColor?: string

  // Encrypted in application layer before save
  @Column({ type: 'text', nullable: true }) privateNotes?: string

  // Prontuário clínico (dados de anamnese, plano terapêutico, etc.)
  @Column({ type: 'jsonb', nullable: true }) prontuario?: Record<string, any>

  /** CPF (11 dígitos) ou CNPJ (14 dígitos) — obrigatório para criar cliente no Asaas */
  @Column({ nullable: true }) cpfCnpj?: string

  /** ID do cliente no Asaas do psicólogo — evita criar duplicatas a cada cobrança */
  @Column({ nullable: true }) asaasCustomerId?: string

  @Column({ type: 'simple-array', nullable: true }) tags: string[]

  @Column({ nullable: true }) psychologistId: string
  @ManyToOne(() => User, (u) => u.patients, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'psychologistId' })
  psychologist: User

  @OneToMany(() => Session, (s) => s.patient) sessions: Session[]
  @OneToMany(() => Appointment, (a) => a.patient) appointments: Appointment[]

  @CreateDateColumn() createdAt: Date
  @UpdateDateColumn() updatedAt: Date
}
