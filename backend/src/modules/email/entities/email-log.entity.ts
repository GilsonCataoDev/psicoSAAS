import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

@Entity('email_logs')
@Index(['createdAt'])
@Index(['status'])
export class EmailLog {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 320 })
  to: string

  @Column({ type: 'varchar', length: 255 })
  subject: string

  @Column({ type: 'varchar', length: 10 })
  status: 'sent' | 'failed' | 'suppressed'

  @Column({ type: 'text', nullable: true })
  error: string | null

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date
}
