import {
  Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryColumn, UpdateDateColumn,
} from 'typeorm'
import { encryptedTextTransformer } from '../../../common/crypto/encrypt.util'
import { User } from '../../auth/entities/user.entity'

@Entity('referral_payout_profiles')
export class ReferralPayoutProfile {
  @PrimaryColumn('uuid')
  userId: string

  @OneToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User

  @Column({ type: 'varchar', length: 16 })
  pixKeyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random'

  @Column({ type: 'text', transformer: encryptedTextTransformer })
  pixKey: string

  @Column({ type: 'text', transformer: encryptedTextTransformer })
  taxpayerId: string

  @Column({ type: 'varchar', length: 20 })
  termsVersion: string

  @Column({ type: 'text' })
  termsText: string

  @Column({ type: 'timestamptz' })
  termsAcceptedAt: Date

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date
}
