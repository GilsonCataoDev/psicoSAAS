import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { encryptedTextTransformer } from '../../../common/crypto/encrypt.util'
import type { SalesCommission } from './sales-commission.entity'

@Entity('sales_reps')
export class SalesRep {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 200 })
  name: string

  @Column({ type: 'varchar', length: 200, unique: true })
  email: string

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null

  @Column({ type: 'text', transformer: encryptedTextTransformer })
  pixKey: string

  @Column({ type: 'varchar', length: 16 })
  pixKeyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random'

  @Column({ type: 'varchar', length: 20, unique: true })
  couponCode: string

  @Column({ type: 'uuid', unique: true, default: () => 'uuid_generate_v4()' })
  accessToken: string

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 48.95 })
  commissionAmount: number

  @Column({ type: 'varchar', length: 8, default: 'active' })
  status: 'active' | 'inactive'

  @OneToMany('SalesCommission', 'salesRep')
  commissions: SalesCommission[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
