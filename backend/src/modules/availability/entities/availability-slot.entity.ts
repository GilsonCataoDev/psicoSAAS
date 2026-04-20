import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm'
import { User } from '../../auth/entities/user.entity'

/**
 * Define a disponibilidade recorrente do psicólogo.
 * Ex: toda segunda-feira das 09:00 às 18:00.
 */
@Entity('availability_slots')
export class AvailabilitySlot {
  @PrimaryGeneratedColumn('uuid') id: string

  // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
  @Column({ type: 'smallint' }) weekday: number

  @Column({ type: 'time' }) startTime: string   // "09:00"
  @Column({ type: 'time' }) endTime: string     // "18:00"

  @Column({ default: true }) isActive: boolean

  @Column() psychologistId: string
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'psychologistId' })
  psychologist: User

  @CreateDateColumn() createdAt: Date
}
