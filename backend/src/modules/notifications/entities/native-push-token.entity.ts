import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm'
import { User } from '../../auth/entities/user.entity'

export type NativePushPlatform = 'android' | 'ios'

@Entity('native_push_tokens')
@Index(['userId', 'token'], { unique: true })
export class NativePushTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  userId: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User

  @Column({ type: 'text' })
  token: string

  @Column({ type: 'varchar', length: 10 })
  platform: NativePushPlatform

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
