import {
  Entity, PrimaryGeneratedColumn, Column,
  OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm'
import { User } from '../../auth/entities/user.entity'

/**
 * Configurações da página pública de agendamento do psicólogo.
 */
@Entity('booking_pages')
export class BookingPage {
  @PrimaryGeneratedColumn('uuid') id: string

  // Slug interno único (auto-gerado a partir do userId — imutável)
  @Column({ unique: true, nullable: true }) slug: string

  @Column({ default: true }) isActive: boolean

  // Personalização da página
  @Column({ nullable: true }) title?: string
  @Column({ type: 'text', nullable: true }) description?: string
  @Column({ nullable: true }) avatarUrl?: string

  // Configurações de sessão
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  sessionPrice: number

  @Column({ default: 50 }) sessionDuration: number   // minutos
  @Column({ default: 30 }) slotInterval: number      // intervalo entre slots

  // Modalidades disponíveis
  @Column({ default: true }) allowPresencial: boolean
  @Column({ default: true }) allowOnline: boolean

  // Antecedência mínima/máxima para agendar (dias)
  @Column({ default: 1 }) minAdvanceDays: number
  @Column({ default: 60 }) maxAdvanceDays: number

  // Pagamento
  @Column({ default: false }) requirePaymentUpfront: boolean
  @Column({ nullable: true }) pixKey?: string
  @Column({ nullable: true }) mercadoPagoPublicKey?: string

  // Mensagem de confirmação personalizada
  @Column({ type: 'text', nullable: true }) confirmationMessage?: string

  @Column({ unique: true }) psychologistId: string
  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'psychologistId' })
  psychologist: User

  @CreateDateColumn() createdAt: Date
  @UpdateDateColumn() updatedAt: Date
}
