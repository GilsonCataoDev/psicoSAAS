import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { DEFAULT_PROFESSION } from '../../../common/professions'

export type TemplateType = 'patient_form' | 'session_note' | 'document' | 'whatsapp_message' | 'receipt'

/**
 * Conjunto de templates servido. 'psicologia' guarda os textos históricos;
 * 'generico' atende as demais profissões — uma declaração de comparecimento
 * dizendo "atendimento psicológico" seria factualmente errada para elas.
 */
export type TemplateProfession = 'psicologia' | 'generico'

@Entity('templates')
export class Template {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'enum', enum: ['patient_form', 'session_note', 'document', 'whatsapp_message', 'receipt'] })
  type: TemplateType

  @Column()
  name: string

  @Column({ type: 'text' })
  content: string

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  tags: string[]

  @Column({ type: 'varchar', length: 40, default: DEFAULT_PROFESSION })
  profession: TemplateProfession

  @Column({ default: true })
  isDefault: boolean

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date
}
