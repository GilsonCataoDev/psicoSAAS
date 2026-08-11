import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'
import { encryptedTextTransformer } from '../../../common/crypto/encrypt.util'

/**
 * Endereços que tiveram bounce permanente ou marcaram um e-mail como spam.
 * Checado antes de todo envio — reenviar para esses endereços derruba a
 * reputação do domínio inteiro no Resend/ISPs, não só do envio individual.
 */
@Entity('email_suppressions')
export class EmailSuppression {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'text', transformer: encryptedTextTransformer })
  email: string

  @Column({ type: 'varchar', length: 64, unique: true })
  emailHash: string

  @Column({ type: 'varchar', length: 20 })
  reason: 'bounced' | 'complained'

  @Column({ type: 'varchar', length: 50, nullable: true })
  sourceEventType: string | null

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date
}
