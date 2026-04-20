import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  CreateDateColumn, JoinColumn,
} from 'typeorm'
import { Patient } from '../../patients/entities/patient.entity'
import { User } from '../../auth/entities/user.entity'

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid') id: string
  @Column() date: string
  @Column() time: string
  @Column({ default: 50 }) duration: number
  @Column({ type: 'text', default: 'scheduled' }) status: string
  @Column({ type: 'text', default: 'presencial' }) modality: string
  @Column({ nullable: true }) notes?: string
  @Column() patientId: string
  @ManyToOne(() => Patient, (p) => p.appointments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' }) patient: Patient
  @Column() psychologistId: string
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'psychologistId' }) psychologist: User
  @CreateDateColumn() createdAt: Date
}
