import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { User } from '../../auth/entities/user.entity'

export type BillingSubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'past_due'
  | 'pending'
  | 'trialing'
  | 'none'

@Entity('billing_subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  userId: string

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User

  @Column({ type: 'varchar' })
  plan: string

  @Column({ type: 'varchar' })
  status: BillingSubscriptionStatus

  @Column({ type: 'varchar', nullable: true })
  gatewayCustomerId?: string

  @Column({ type: 'varchar', nullable: true })
  gatewaySubscriptionId?: string

  @Column({ type: 'timestamptz', nullable: true })
  currentPeriodEnd?: Date

  @Column({ type: 'timestamptz', nullable: true })
  trialEndsAt?: Date | null

  @Column({ type: 'boolean', default: false })
  cancelAtPeriodEnd: boolean

  @Column({ type: 'boolean', default: false })
  hasUsedTrial: boolean

  @Column({ type: 'varchar', nullable: true })
  promoCode?: string | null

  @Column({ type: 'int', default: 0 })
  promoDiscountPercent: number

  @Column({ type: 'int', default: 0 })
  promoCyclesTotal: number

  @Column({ type: 'int', default: 0 })
  promoCyclesUsed: number

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  regularMonthlyValue?: string | null

  @Column({ type: 'varchar', nullable: true })
  lastPromoPaymentId?: string | null

  @Column({ type: 'timestamptz', nullable: true })
  upgradeOfferViewedAt?: Date | null

  @Column({ type: 'timestamptz', nullable: true })
  activationOfferRedeemedAt?: Date | null

  @Column({ type: 'timestamptz', nullable: true })
  upgradeOfferEmailedAt?: Date | null

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date
}
