import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm'
import { Patient } from '../../patients/entities/patient.entity'
import { User } from '../../auth/entities/user.entity'

@Entity('instrument_assignments')
export class InstrumentAssignment {
  @PrimaryGeneratedColumn('uuid') id: string

  @Index({ unique: true })
  @Column()
  token: string

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

  @Column({ type: 'text', default: 'pending' })
  status: 'pending' | 'completed' | 'expired'

  @Column({ type: 'timestamptz' })
  expiresAt: Date

  @Column({ type: 'timestamptz', nullable: true })
  completedAt?: Date

  @Column({ type: 'text', nullable: true })
  responseText?: string

  @Column({ type: 'text', nullable: true })
  responseData?: string

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
