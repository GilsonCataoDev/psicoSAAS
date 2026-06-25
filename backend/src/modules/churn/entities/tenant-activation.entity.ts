import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('tenant_activations')
export class TenantActivation {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  userId: string

  @Index()
  @Column({ default: false })
  activated: boolean

  @Column({ type: 'timestamptz', nullable: true })
  activatedAt: Date | null

  @Column({ default: 0 })
  patientCount: number

  @Column({ default: 0 })
  sessionCount: number

  @Column({ default: 0 })
  appointmentCount: number

  @Index()
  @Column({ default: false })
  needsOnboarding: boolean

  @Column({ type: 'timestamptz', nullable: true })
  needsOnboardingAt: Date | null

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
