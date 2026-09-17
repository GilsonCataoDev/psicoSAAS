import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { encryptedTextTransformer } from '../../../common/crypto/encrypt.util'
import { User } from '../../auth/entities/user.entity'
import { Patient } from '../../patients/entities/patient.entity'

/** Registro antropométrico. Medidas e observações são cifradas em repouso. */
@Entity('nutrition_assessments')
export class NutritionAssessment {
  @PrimaryGeneratedColumn('uuid') id: string

  @Column() psychologistId: string
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'psychologistId' }) psychologist: User

  @Column() patientId: string
  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' }) patient: Patient

  /** Data operacional usada somente para ordenar a evolução. */
  @Column({ type: 'date' }) assessedAt: string

  @Column({ type: 'text', transformer: encryptedTextTransformer }) weightKg: string
  @Column({ type: 'text', nullable: true, transformer: encryptedTextTransformer }) heightCm?: string
  @Column({ type: 'text', nullable: true, transformer: encryptedTextTransformer }) waistCm?: string
  @Column({ type: 'text', nullable: true, transformer: encryptedTextTransformer }) bodyFatPercent?: string
  @Column({ type: 'text', nullable: true, transformer: encryptedTextTransformer }) notes?: string

  @CreateDateColumn() createdAt: Date
  @UpdateDateColumn() updatedAt: Date
}
