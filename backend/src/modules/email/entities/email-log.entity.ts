import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'
import { encryptedTextTransformer } from '../../../common/crypto/encrypt.util'

@Entity('email_logs')
@Index(['createdAt'])
@Index(['status'])
export class EmailLog {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'text', transformer: encryptedTextTransformer })
  to: string

  @Column({ type: 'varchar', length: 64, nullable: true, select: false })
  toHash?: string

  @Column({ type: 'text', transformer: encryptedTextTransformer })
  subject: string

  @Column({ type: 'varchar', length: 10 })
  status: 'sent' | 'failed' | 'suppressed'

  @Column({ type: 'text', nullable: true, transformer: encryptedTextTransformer })
  error: string | null

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date
}
