import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

/**
 * Endereços que tiveram bounce permanente ou marcaram um e-mail como spam.
 * Checado antes de todo envio — reenviar para esses endereços derruba a
 * reputação do domínio inteiro no Resend/ISPs, não só do envio individual.
 */
@Entity('email_suppressions')
export class EmailSuppression {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 320, unique: true })
  email: string

  @Column({ type: 'varchar', length: 20 })
  reason: 'bounced' | 'complained'

  @Column({ type: 'varchar', length: 50, nullable: true })
  sourceEventType: string | null

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date
}
