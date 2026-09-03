import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

export type ProspectingSearchStatus = 'pending' | 'running' | 'completed' | 'error'

@Entity('prospecting_searches')
export class ProspectingSearch {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 120, nullable: true })
  city: string | null

  @Column({ type: 'varchar', length: 2, nullable: true })
  state: string | null

  @Column({ type: 'text' })
  query: string

  @Column({ type: 'varchar', length: 32 })
  provider: string

  @Column({ type: 'integer', default: 0 })
  resultCount: number

  @Index()
  @Column({ type: 'varchar', length: 24, default: 'pending' })
  status: ProspectingSearchStatus

  @Column({ type: 'numeric', precision: 10, scale: 4, default: 0 })
  costEstimate: number

  @Column({ type: 'timestamptz', nullable: true })
  startedAt: Date | null

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt: Date | null

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null

  @CreateDateColumn()
  createdAt: Date
}
