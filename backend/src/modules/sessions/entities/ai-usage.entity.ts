import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('ai_usage')
@Index(['userId', 'month'], { unique: true })
export class AiUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  userId: string

  @Column({ type: 'varchar', length: 7 })
  month: string

  @Column({ type: 'int', default: 0 })
  transcriptionSeconds: number

  @Column({ type: 'int', default: 0 })
  summaryRequests: number

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date
}
