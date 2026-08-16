import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm'
import { User } from '../../auth/entities/user.entity'

/** Atalho de texto pessoal do psicólogo, reutilizável ao escrever evoluções. */
@Entity('note_snippets')
export class NoteSnippet {
  @PrimaryGeneratedColumn('uuid') id: string

  @Column({ length: 60 }) label: string
  @Column({ type: 'text' }) content: string

  @Column() psychologistId: string
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'psychologistId' }) psychologist: User

  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date
}
