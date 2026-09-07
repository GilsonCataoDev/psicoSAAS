import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn, Relation,
} from 'typeorm'
import { User } from '../../auth/entities/user.entity'
import { Session } from '../../sessions/entities/session.entity'
import { Appointment } from '../../appointments/entities/appointment.entity'
import { encryptedTextTransformer } from '../../../common/crypto/encrypt.util'

export type PatientStatus = 'active' | 'paused' | 'discharged'
export type PatientBillingType = 'per_session' | 'monthly_package' | 'session_package'
export type PatientCareMode = 'psychotherapy' | 'neuropsychological_assessment'

@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn('uuid') id: string

  @Column({ type: 'text', transformer: encryptedTextTransformer }) name: string
  @Column({ type: 'text', nullable: true, transformer: encryptedTextTransformer }) email?: string
  @Column({ type: 'text', nullable: true, transformer: encryptedTextTransformer }) phone?: string
  @Column({ type: 'varchar', length: 64, nullable: true, select: false }) emailHash?: string
  @Column({ type: 'varchar', length: 64, nullable: true, select: false }) phoneHash?: string
  @Column({ nullable: true }) birthDate?: string
  @Column({ nullable: true }) pronouns?: string
  @Column({ nullable: true }) race?: string
  @Column({ nullable: true }) gender?: string
  @Column({ nullable: true }) sexualOrientation?: string

  @Column({ type: 'text', default: 'active' })
  status: PatientStatus

  @Column({ type: 'text', default: 'psychotherapy' })
  careMode: PatientCareMode

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  sessionPrice: number

  @Column({ type: 'text', default: 'per_session' })
  billingType: PatientBillingType

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  monthlyPackagePrice: number

  @Column({ type: 'int', default: 4 })
  monthlyIncludedSessions: number

  @Column({ type: 'int', default: 5 })
  billingDay: number

  @Column({ default: 50 }) sessionDuration: number
  @Column({ nullable: true }) startDate?: string
  @Column({ nullable: true }) avatarColor?: string
  @Column({ default: false }) hasFixedSchedule: boolean
  @Column({ nullable: true }) fixedScheduleWeekday?: number
  @Column({ nullable: true }) fixedScheduleTime?: string
  @Column({ type: 'text', default: 'weekly' }) fixedScheduleFrequency: 'weekly' | 'biweekly'
  @Column({ type: 'text', default: 'presencial' }) fixedScheduleModality: 'presencial' | 'online'

  // Encrypted in application layer before save
  @Column({ type: 'text', nullable: true }) privateNotes?: string

  // Prontuário clínico (dados de anamnese, plano terapêutico, etc.)
  @Column({ type: 'jsonb', nullable: true }) prontuario?: Record<string, any>

  /** CPF (11 dígitos) ou CNPJ (14 dígitos) — obrigatório para criar cliente no Asaas */
  @Column({ nullable: true }) cpfCnpj?: string

  /** ID do cliente no Asaas do psicólogo — evita criar duplicatas a cada cobrança */
  @Column({ nullable: true }) asaasCustomerId?: string

  @Column({ nullable: true })
  portalTokenHash?: string

  @Column({ type: 'timestamptz', nullable: true })
  portalTokenCreatedAt?: Date

  @Column({ type: 'simple-array', nullable: true }) tags: string[]

  /** Preferências de lembrete por paciente — sobrepõe o padrão do profissional */
  @Column({ type: 'jsonb', nullable: true }) reminderPrefs?: {
    enabled: boolean
    leads: ('1h' | '24h')[]
    channel: 'whatsapp' | 'email' | 'both'
  }

  @Column({ nullable: true }) psychologistId: string
  @ManyToOne(() => User, (u) => u.patients, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'psychologistId' })
  psychologist: Relation<User>

  @OneToMany(() => Session, (s) => s.patient) sessions: Relation<Session[]>
  @OneToMany(() => Appointment, (a) => a.patient) appointments: Relation<Appointment[]>

  @CreateDateColumn() createdAt: Date
  @UpdateDateColumn() updatedAt: Date
}
