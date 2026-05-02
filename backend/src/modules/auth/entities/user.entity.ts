import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm'
import { Patient } from '../../patients/entities/patient.entity'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  name: string

  @Column({ unique: true })
  email: string

  @Column()
  passwordHash: string

  @Column()
  crp: string

  @Column({ nullable: true })
  specialty?: string

  @Column({ nullable: true })
  avatarUrl?: string

  @Column({ default: true })
  isActive: boolean

  @Column({ default: false })
  onboardingCompleted: boolean

  @Column({ nullable: true })
  phone?: string

  /** CPF (11 dígitos) ou CNPJ (14 dígitos) — usado como customer no Asaas para assinatura */
  @Column({ nullable: true })
  cpfCnpj?: string

  @Column({ type: 'timestamptz', nullable: true })
  termsAcceptedAt?: Date

  @Column({ type: 'varchar', length: 20, nullable: true })
  termsVersion?: string

  @Column({ nullable: true })
  referralCode?: string   // código usado no cadastro

  /** Token de reset de senha (HMAC hex) — limpo após uso ou expiração */
  @Column({ nullable: true })
  resetPasswordToken?: string

  @Column({ type: 'timestamptz', nullable: true })
  resetPasswordExpiry?: Date

  @Column({ type: 'jsonb', nullable: true })
  preferences?: Record<string, unknown>

  @OneToMany(() => Patient, (p) => p.psychologist)
  patients: Patient[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
