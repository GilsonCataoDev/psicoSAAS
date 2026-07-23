import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm'
import { User } from '../../auth/entities/user.entity'

@Entity('extra_availability_slots')
export class ExtraAvailabilitySlot {
  @PrimaryGeneratedColumn('uuid') id: string

  @Column({ type: 'date' }) date: string
  @Column({ type: 'time' }) startTime: string
  @Column({ type: 'time' }) endTime: string

  @Column({ type: 'varchar', default: 'online' })
  modality: 'presencial' | 'online'

  @Column({ default: true }) isActive: boolean

  @Column({ type: 'uuid' }) psychologistId: string
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'psychologistId' })
  psychologist: User

  @CreateDateColumn() createdAt: Date
}
