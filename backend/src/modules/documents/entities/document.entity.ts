import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm'
import { User } from '../../auth/entities/user.entity'

export type DocType = 'declaracao' | 'recibo' | 'relatorio' | 'atestado' | 'encaminhamento'

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  userId: string

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User

  @Column()
  patientId: string

  @Column()
  patientName: string

  @Column({ type: 'varchar' })
  type: DocType

  @Column()
  title: string

  @Column({ type: 'text' })
  content: string

  // ─── Assinatura digital ───────────────────────────────────────────────────
  /** Código único: PS-{ano}-{8 chars HMAC-SHA256} */
  @Index({ unique: true })
  @Column()
  signCode: string

  /** HMAC-SHA256 completo do conteúdo (para verificação criptográfica) */
  @Column({ type: 'varchar', length: 64 })
  signHash: string

  @Column({ type: 'timestamptz' })
  signedAt: Date

  /** IP do signatário */
  @Column({ nullable: true })
  signerIp?: string

  @Column()
  psychologistName: string

  @Column()
  psychologistCrp: string

  @CreateDateColumn()
  createdAt: Date
}
