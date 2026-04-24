import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm'
import { User } from '../../auth/entities/user.entity'

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled'
export type BillingType = 'CREDIT_CARD' | 'PIX' | 'BOLETO'
export type PlanId = 'free' | 'essencial' | 'pro'

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  userId: string

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User

  // ─── Asaas IDs ─────────────────────────────────────────────────────────────
  @Column({ nullable: true })
  asaasCustomerId?: string

  @Column({ nullable: true })
  asaasSubscriptionId?: string

  @Column({ nullable: true })
  asaasPaymentId?: string   // último pagamento gerado

  // ─── Plano ────────────────────────────────────────────────────────────────
  @Column({ type: 'varchar', default: 'essencial' })
  planId: PlanId

  @Column({ type: 'varchar', default: 'trialing' })
  status: SubscriptionStatus

  @Column({ type: 'varchar', nullable: true })
  billingType?: BillingType

  @Column({ type: 'boolean', default: false })
  yearly: boolean

  // ─── Datas ────────────────────────────────────────────────────────────────
  @Column({ type: 'timestamptz', nullable: true })
  trialEndsAt?: Date

  @Column({ type: 'timestamptz', nullable: true })
  currentPeriodEnd?: Date

  @Column({ type: 'boolean', default: false })
  cancelAtPeriodEnd: boolean

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
