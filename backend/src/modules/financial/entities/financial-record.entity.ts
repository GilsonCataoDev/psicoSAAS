import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  CreateDateColumn, JoinColumn,
} from 'typeorm'
import { Patient } from '../../patients/entities/patient.entity'
import { User } from '../../auth/entities/user.entity'

@Entity('financial_records')
export class FinancialRecord {
  @PrimaryGeneratedColumn('uuid') id: string
  @Column({ type: 'text', default: 'income' }) type: 'income' | 'expense'
  @Column({ type: 'decimal', precision: 10, scale: 2 }) amount: number
  @Column() description: string
  @Column({ type: 'text', default: 'pending' }) status: string
  @Column({ nullable: true }) dueDate?: string
  @Column({ nullable: true }) paidAt?: string
  @Column({ nullable: true }) method?: string
  @Column({ nullable: true }) sessionId?: string
  @Column({ nullable: true }) receiptUrl?: string
  @Column({ nullable: true }) asaasPaymentId?: string
  @Column({ nullable: true }) paymentLinkUrl?: string
  @Column({ nullable: true }) patientId?: string
  @ManyToOne(() => Patient, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'patientId' }) patient?: Patient
  @Column() psychologistId: string
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'psychologistId' }) psychologist: User
  @CreateDateColumn() createdAt: Date
}
