import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm'
import { User } from '../../auth/entities/user.entity'

@Entity('push_subscriptions')
@Index(['userId', 'endpoint'], { unique: true })
export class PushSubscriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  userId: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User

  @Column({ type: 'text' })
  endpoint: string

  @Column({ type: 'text' })
  p256dh: string

  @Column({ type: 'text' })
  auth: string

  @Column({ type: 'text', nullable: true })
  userAgent?: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
