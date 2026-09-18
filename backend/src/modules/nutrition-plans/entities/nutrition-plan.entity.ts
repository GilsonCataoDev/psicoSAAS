import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { User } from '../../auth/entities/user.entity'
import { Patient } from '../../patients/entities/patient.entity'
import { encryptedTextTransformer } from '../../../common/crypto/encrypt.util'

/**
 * Plano alimentar prescrito pelo nutricionista ao paciente.
 * O conteúdo (refeições, porções, orientações) é armazenado em texto livre
 * (markdown) e cifrado em repouso — dado clínico sensível (CFN Resolução 600/2018).
 */
@Entity('nutrition_plans')
export class NutritionPlan {
  @PrimaryGeneratedColumn('uuid') id: string

  @Column() userId: string
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' }) user: User

  @Column() patientId: string
  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' }) patient: Patient

  @Column({ default: 'Plano Alimentar' }) title: string

  /** Conteúdo do plano em texto/markdown — cifrado em repouso. */
  @Column({ type: 'text', transformer: encryptedTextTransformer }) content: string

  /** Energia total prescrita em kcal/dia (opcional). */
  @Column({ type: 'int', nullable: true }) totalCalories?: number

  /** Início da vigência do plano (opcional). */
  @Column({ type: 'date', nullable: true }) validFrom?: string

  /** Fim da vigência do plano (opcional). */
  @Column({ type: 'date', nullable: true }) validUntil?: string

  @CreateDateColumn() createdAt: Date
  @UpdateDateColumn() updatedAt: Date
}
