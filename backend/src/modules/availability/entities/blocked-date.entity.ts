import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm'
import { User } from '../../auth/entities/user.entity'

/**
 * Datas bloqueadas manualmente (férias, feriados, etc.)
 */
@Entity('blocked_dates')
export class BlockedDate {
  @PrimaryGeneratedColumn('uuid') id: string
  @Column({ type: 'date' }) date: string
  @Column({ nullable: true }) reason?: string
  @Column() psychologistId: string
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'psychologistId' })
  psychologist: User
}
