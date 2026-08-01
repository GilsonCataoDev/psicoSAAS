import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm'
import { User } from '../../auth/entities/user.entity'

@Entity('recurring_expenses')
export class RecurringExpense {
  @PrimaryGeneratedColumn('uuid') id: string

  @Column({ length: 180 })
  description: string

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number

  @Column({ length: 40, nullable: true })
  category?: string

  @Column({ type: 'int', default: 1 })
  dayOfMonth: number

  @Column({ type: 'boolean', default: true })
  active: boolean

  /** 'YYYY-MM' do último lançamento gerado — evita duplicar dentro do mesmo mês. */
  @Column({ length: 7, nullable: true })
  lastGeneratedMonth?: string

  @Column()
  psychologistId: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'psychologistId' })
  psychologist: User

  @CreateDateColumn() createdAt: Date
  @UpdateDateColumn() updatedAt: Date
}
