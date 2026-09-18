import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm'
import { Patient } from '../../patients/entities/patient.entity'
import { User } from '../../auth/entities/user.entity'

@Entity('patient_tasks')
export class PatientTask {
  @PrimaryGeneratedColumn('uuid') id: string

  @Column() patientId: string
  @Column() userId: string

  @Column({ length: 200 }) title: string

  @Column({ type: 'text', nullable: true }) description?: string

  /** Data de entrega no formato YYYY-MM-DD */
  @Column({ nullable: true }) dueDate?: string

  /** null = pendente; preenchido = concluída pelo paciente */
  @Column({ type: 'timestamptz', nullable: true }) completedAt?: Date

  @CreateDateColumn() createdAt: Date
  @UpdateDateColumn() updatedAt: Date

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' })
  patient: Relation<Patient>

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: Relation<User>
}
