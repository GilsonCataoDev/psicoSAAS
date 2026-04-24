import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm'
import { User } from '../../auth/entities/user.entity'

@Entity('referrals')
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  id: string

  // Quem indicou
  @Column()
  referrerId: string

  @ManyToOne(() => User)
  @JoinColumn({ name: 'referrerId' })
  referrer: User

  // Quem foi indicado
  @Column({ nullable: true })
  referredId?: string

  @Column({ unique: true })
  code: string   // ex: CAROL123

  @Column({ default: false })
  rewardGranted: boolean

  @Column({ nullable: true })
  rewardGrantedAt?: Date

  @CreateDateColumn()
  createdAt: Date
}
