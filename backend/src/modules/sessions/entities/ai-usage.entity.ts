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

  @Column({ type: 'int', default: 0 })
  neuropsychAnalyses: number

  /**
   * Custo real do Copiloto Neuropsicológico — separado das colunas genéricas
   * abaixo (usadas por outras funcionalidades de IA) para o orçamento global
   * mensal do Copiloto não se misturar com custo de outras features.
   * bigint: linha "sentinela" (orçamento global) acumula de todas as contas.
   */
  @Column({ type: 'bigint', default: 0 })
  neuropsychInputTokens: string

  @Column({ type: 'bigint', default: 0 })
  neuropsychOutputTokens: string

  @Column({ type: 'bigint', default: 0 })
  neuropsychCostUsdMicros: string

  @Column({ type: 'int', default: 0 })
  aiInputTokens: number

  @Column({ type: 'int', default: 0 })
  aiOutputTokens: number

  @Column({ type: 'int', default: 0 })
  aiCostUsdMicros: number

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date
}
