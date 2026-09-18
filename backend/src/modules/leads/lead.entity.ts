import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm'

export enum LeadProfession {
  Psicologia    = 'psicologia',
  Fisioterapia  = 'fisioterapia',
  Nutricao      = 'nutricao',
  Estetica      = 'estetica',
  Outro         = 'outro',
}

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 200 })
  name: string

  @Index('idx_leads_email')
  @Column({ type: 'varchar', length: 200 })
  email: string

  @Column({ type: 'varchar', length: 20, default: LeadProfession.Psicologia })
  profession: LeadProfession

  @Column({ type: 'varchar', length: 100, nullable: true })
  source: string | null

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date
}
