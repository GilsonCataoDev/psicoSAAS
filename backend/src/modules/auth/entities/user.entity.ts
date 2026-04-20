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

  @Column({ type: 'jsonb', nullable: true })
  preferences?: Record<string, unknown>

  @OneToMany(() => Patient, (p) => p.psychologist)
  patients: Patient[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
