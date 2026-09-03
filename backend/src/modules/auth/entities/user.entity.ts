import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany, Relation,
} from 'typeorm'
import { Patient } from '../../patients/entities/patient.entity'
import { encryptedTextTransformer } from '../../../common/crypto/encrypt.util'
import { DEFAULT_PROFESSION, Profession } from '../../../common/professions'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  name: string

  @Column({ unique: true })
  email: string

  @Column({ select: false })
  passwordHash: string

  @Column({ nullable: true })
  crp: string | null

  /** Estudante de psicologia sem CRP — documentos oficiais assinados exigem CRP preenchido. */
  @Column({ default: false })
  isStudent: boolean

  /**
   * Profissão do titular — define vocabulário da interface e módulos visíveis.
   * Default 'psicologia' mantém as contas existentes idênticas ao que já era.
   */
  @Column({ type: 'varchar', length: 40, default: DEFAULT_PROFESSION })
  profession: Profession

  /** Abordagem/subespecialidade em texto livre (ex: "Terapia Cognitivo-Comportamental"). Exibida publicamente. */
  @Column({ nullable: true })
  specialty?: string

  @Column({ nullable: true })
  avatarUrl?: string

  @Column({ default: true })
  isActive: boolean

  @Column({ default: false })
  onboardingCompleted: boolean

  @Column({ default: true })
  firstLogin: boolean

  @Column({ default: 0 })
  onboardingStep: number

  @Column({ type: 'text', nullable: true, transformer: encryptedTextTransformer })
  phone?: string

  /** CPF (11 dígitos) ou CNPJ (14 dígitos) — usado como customer no Asaas para assinatura */
  @Column({ type: 'text', nullable: true, transformer: encryptedTextTransformer })
  cpfCnpj?: string

  @Column({ type: 'timestamptz', nullable: true })
  termsAcceptedAt?: Date

  @Column({ type: 'varchar', length: 20, nullable: true })
  termsVersion?: string

  @Column({ nullable: true })
  referralCode?: string   // código usado no cadastro

  /** Token de reset de senha (HMAC hex) — limpo após uso ou expiração */
  @Column({ default: false })
  emailVerified: boolean

  @Column({ nullable: true, select: false })
  emailVerificationToken?: string | null

  @Column({ type: 'timestamptz', nullable: true })
  emailVerificationExpiry?: Date | null

  @Column({ nullable: true, select: false })
  resetPasswordToken?: string | null

  @Column({ type: 'timestamptz', nullable: true })
  resetPasswordExpiry?: Date | null

  @Column({ type: 'jsonb', nullable: true })
  preferences?: Record<string, unknown>

  @Column({ type: 'timestamptz', nullable: true })
  lastActiveAt?: Date

  @OneToMany(() => Patient, (p) => p.psychologist)
  patients: Relation<Patient[]>

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}

/** CRP exibido ao paciente: valor real, "Estudante de Psicologia" (sem CRP, conta de estudante) ou null. */
export function formatCrpForDisplay(user: Pick<User, 'crp' | 'isStudent'>): string | null {
  if (user.crp) return user.crp
  return user.isStudent ? 'Estudante de Psicologia' : null // isStudent so existe no fluxo de psicologia
}
