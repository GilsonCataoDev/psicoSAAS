import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'
import { encryptedTextTransformer } from '../../../common/crypto/encrypt.util'

@Entity('audit_logs')
@Index(['userId', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  userId: string

  @Column()
  action: string

  @Column()
  resource: string

  @Column({ nullable: true })
  resourceId?: string

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>

  @Column({ type: 'text', nullable: true, transformer: encryptedTextTransformer })
  ip?: string

  @Column({ type: 'text', nullable: true, transformer: encryptedTextTransformer })
  userAgent?: string

  @CreateDateColumn()
  createdAt: Date
}
