import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  CreateDateColumn, UpdateDateColumn, JoinColumn,
} from 'typeorm'
import { Patient } from '../../patients/entities/patient.entity'
import { User } from '../../auth/entities/user.entity'

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid') id: string
  @Column() date: string
  @Column({ default: 50 }) duration: number
  @Column({ nullable: true }) appointmentId?: string
  @Column({ type: 'int', nullable: true }) mood?: number

  // Stored encrypted
  @Column({ type: 'text', nullable: true }) summary?: string
  @Column({ type: 'text', nullable: true }) privateNotes?: string
  @Column({ type: 'text', nullable: true }) nextSteps?: string

  @Column({ type: 'simple-array', nullable: true }) tags: string[]
  @Column({ type: 'text', default: 'pending' }) paymentStatus: string
  @Column({ nullable: true }) paymentId?: string

  @Column() patientId: string
  @ManyToOne(() => Patient, (p) => p.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' }) patient: Patient

  @Column() psychologistId: string
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'psychologistId' }) psychologist: User

  @CreateDateColumn() createdAt: Date
  @UpdateDateColumn() updatedAt: Date
}
