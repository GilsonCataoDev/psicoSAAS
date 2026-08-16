import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm'
import { User } from '../../auth/entities/user.entity'

export type AvailabilityBlockType = 'weekly' | 'date'

@Entity('availability_blocks')
export class AvailabilityBlock {
  @PrimaryGeneratedColumn('uuid') id: string

  @Column({ type: 'varchar' })
  type: AvailabilityBlockType

  @Column({ type: 'smallint', nullable: true })
  weekday?: number | null

  @Column({ type: 'date', nullable: true })
  date?: string | null

  @Column({ type: 'time' }) startTime: string
  @Column({ type: 'time' }) endTime: string

  @Column({ nullable: true }) reason?: string

  @Column({ type: 'uuid' }) psychologistId: string
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'psychologistId' })
  psychologist: User

  @CreateDateColumn() createdAt: Date
}
