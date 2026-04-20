import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm'
import { User } from '../../auth/entities/user.entity'

/**
 * Agendamento realizado pelo paciente via link público.
 * Independente do sistema interno de Appointment —
 * ao ser confirmado/aceito pelo psicólogo, gera um Appointment.
 */
@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid') id: string

  // Dados do paciente (pode ser novo ou existente)
  @Column() patientName: string
  @Column() patientEmail: string
  @Column({ nullable: true }) patientPhone?: string

  @Column({ type: 'date' }) date: string
  @Column({ type: 'time' }) time: string
  @Column({ default: 50 }) duration: number

  @Column({ type: 'text', default: 'pending' })
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'

  // Token único para confirmar/cancelar via link no e-mail/WhatsApp
  @Column({ unique: true }) confirmationToken: string
  @Column({ nullable: true }) confirmedAt?: Date
  @Column({ nullable: true }) cancelledAt?: Date
  @Column({ nullable: true }) cancellationReason?: string

  // Pagamento
  @Column({ type: 'text', default: 'pending' })
  paymentStatus: 'pending' | 'paid' | 'waived' | 'refunded'

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  amount: number

  @Column({ nullable: true }) paymentMethod?: string
  @Column({ nullable: true }) paymentId?: string
  @Column({ nullable: true }) paidAt?: Date

  // Referência ao Appointment interno (criado após confirmação)
  @Column({ nullable: true }) appointmentId?: string

  // Notas do paciente ao agendar
  @Column({ type: 'text', nullable: true }) patientNotes?: string

  @Column() psychologistId: string
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'psychologistId' })
  psychologist: User

  @CreateDateColumn() createdAt: Date
  @UpdateDateColumn() updatedAt: Date
}
