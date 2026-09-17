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

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'referredId' })
  referred?: User

  @Column()
  code: string   // ex: CAROL123 — mesmo código para todas as indicações do mesmo usuário

  @Column({ default: false })
  rewardGranted: boolean

  @Column({ nullable: true })
  rewardGrantedAt?: Date

  @Column({ type: 'varchar', length: 24, default: 'captured' })
  status: 'captured' | 'validating' | 'payable' | 'paid' | 'refunded' | 'chargeback' | 'ineligible'

  @Column({ type: 'varchar', nullable: true })
  firstPaymentId?: string | null

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  firstPaymentGross?: string | null

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  commissionAmount?: string | null

  @Column({ type: 'timestamptz', nullable: true })
  paymentApprovedAt?: Date | null

  @Column({ type: 'timestamptz', nullable: true })
  commissionAvailableAt?: Date | null

  @Column({ type: 'timestamptz', nullable: true })
  commissionPaidAt?: Date | null

  @Column({ type: 'varchar', length: 160, nullable: true })
  payoutReference?: string | null

  @Column({ type: 'varchar', length: 240, nullable: true })
  ineligibleReason?: string | null

  @CreateDateColumn()
  createdAt: Date
}
