import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm'
import { Session } from './session.entity'
import { User } from '../../auth/entities/user.entity'

/**
 * Snapshot do conteúdo clínico ANTES de cada edição de summary/privateNotes/
 * nextSteps — trilha de auditoria do prontuário. Nunca é editada nem
 * removida (exceto em cascata se a sessão for excluída).
 */
@Entity('session_revisions')
export class SessionRevision {
  @PrimaryGeneratedColumn('uuid') id: string

  @Column() sessionId: string
  @ManyToOne(() => Session, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' }) session: Session

  @Column() psychologistId: string
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'psychologistId' }) psychologist: User

  // Snapshot criptografado do estado ANTERIOR à edição
  @Column({ type: 'text', nullable: true }) summary?: string
  @Column({ type: 'text', nullable: true }) privateNotes?: string
  @Column({ type: 'text', nullable: true }) nextSteps?: string

  @CreateDateColumn({ type: 'timestamptz' }) editedAt: Date
}
