import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  CreateDateColumn, UpdateDateColumn, JoinColumn, Relation,
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

  /** HMAC-SHA256 do conteúdo clínico — permite detectar adulteração (mesmo padrão de Documents). */
  @Column({ type: 'varchar', length: 64, nullable: true }) contentHash?: string
  /** Timestamp da última edição de summary/privateNotes/nextSteps (distinto de updatedAt, que muda em qualquer campo). */
  @Column({ type: 'timestamptz', nullable: true }) lastEditedAt?: Date
  /** JSON criptografado de complementos pós-edição (Array<{text, createdAt}>) — nunca sobrescreve o texto original. */
  @Column({ type: 'text', nullable: true }) addenda?: string

  @Column() patientId: string
  @ManyToOne(() => Patient, (p) => p.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' }) patient: Relation<Patient>

  @Column() psychologistId: string
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'psychologistId' }) psychologist: Relation<User>

  @CreateDateColumn() createdAt: Date
  @UpdateDateColumn() updatedAt: Date
}
