import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm'
import { Patient } from '../../patients/entities/patient.entity'
import { User } from '../../auth/entities/user.entity'

export type InstrumentRecurrence = 'weekly' | 'biweekly' | 'monthly'

// Regra de envio recorrente de um instrumento a um paciente. Cada linha aqui
// gera periodicamente uma nova InstrumentAssignment (a "ocorrencia" enviada),
// sem pre-gerar todas as ocorrencias futuras de uma vez — ver InstrumentRecurrenceJob.
@Entity('instrument_schedules')
export class InstrumentSchedule {
  @PrimaryGeneratedColumn('uuid') id: string

  @Column()
  instrumentId: string

  @Column()
  title: string

  @Column({ nullable: true })
  description?: string

  @Column()
  category: string

  @Column({ type: 'text' })
  template: string

  @Column({ type: 'boolean', default: false })
  sendWhatsApp: boolean

  @Column({ type: 'text' })
  recurrence: InstrumentRecurrence

  @Index()
  @Column({ type: 'timestamptz' })
  nextSendAt: Date

  @Index()
  @Column({ type: 'boolean', default: true })
  active: boolean

  @Column({ type: 'uuid', nullable: true })
  lastAssignmentId?: string

  @Column()
  patientId: string

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' })
  patient: Patient

  @Column()
  psychologistId: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'psychologistId' })
  psychologist: User

  @CreateDateColumn() createdAt: Date
  @UpdateDateColumn() updatedAt: Date
}
