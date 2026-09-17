import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { SalesRep } from './sales-rep.entity'
import { User } from '../../auth/entities/user.entity'

export type CommissionStatus =
  | 'pending'
  | 'validating'
  | 'payable'
  | 'paid'
  | 'refunded'
  | 'chargeback'

@Entity('sales_commissions')
export class SalesCommission {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'uuid', nullable: true })
  salesRepId: string | null

  @ManyToOne(() => SalesRep, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'salesRepId' })
  salesRep: SalesRep | null

  @Column({ type: 'uuid', nullable: true })
  userId: string | null

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User | null

  @Column({ type: 'varchar', length: 20 })
  couponCode: string

  @Column({ type: 'varchar', length: 200, nullable: true })
  paymentId: string | null

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  grossAmount: number | null

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  commissionAmount: number

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: CommissionStatus

  @Column({ type: 'timestamptz', nullable: true })
  paymentApprovedAt: Date | null

  @Column({ type: 'timestamptz', nullable: true })
  commissionAvailableAt: Date | null

  @Column({ type: 'timestamptz', nullable: true })
  commissionPaidAt: Date | null

  @Column({ type: 'varchar', length: 160, nullable: true })
  payoutReference: string | null

  @Column({ type: 'varchar', length: 240, nullable: true })
  ineligibleReason: string | null

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
