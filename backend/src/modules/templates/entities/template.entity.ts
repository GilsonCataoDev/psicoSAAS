import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

export type TemplateType = 'patient_form' | 'document' | 'whatsapp_message' | 'receipt'

@Entity('templates')
export class Template {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'enum', enum: ['patient_form', 'document', 'whatsapp_message', 'receipt'] })
  type: TemplateType

  @Column()
  name: string

  @Column({ type: 'text' })
  content: string

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  tags: string[]

  @Column({ default: true })
  isDefault: boolean

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date
}
