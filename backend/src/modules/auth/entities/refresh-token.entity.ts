import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

/**
 * Armazena o hash SHA-256 do refresh token (nunca o token bruto).
 * O token bruto fica exclusivamente no cookie HttpOnly do cliente.
 *
 * Rotation: a cada uso, o token atual é marcado como revogado e um novo é gerado.
 * Replay detection: se um token revogado é reutilizado, TODOS os tokens do
 * usuário são invalidados imediatamente — assume-se que a sessão foi comprometida.
 */
@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string

  /** SHA-256 do token bruto — nunca exposto fora desta tabela */
  @Column({ select: false })
  tokenHash: string

  @Column()
  userId: string

  /** Contexto opcional da sessão — para exibição em "dispositivos conectados" */
  @Column({ nullable: true })
  userAgent?: string

  @Column({ name: 'ip', nullable: true })
  ipAddress?: string

  /** Marcado como true na rotação ou no logout — não é removido imediatamente */
  @Column({ default: false })
  revoked: boolean

  @Column({ type: 'timestamptz' })
  expiresAt: Date

  @CreateDateColumn()
  createdAt: Date
}
