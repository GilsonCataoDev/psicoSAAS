import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn,
} from 'typeorm'

@Entity('testimonials')
export class Testimonial {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'uuid' })
  userId: string

  @Column({ type: 'int', nullable: true })
  rating: number | null

  @Column({ type: 'text', nullable: true })
  text: string | null

  /** true quando o usuário fechou o modal sem responder */
  @Column({ default: false })
  dismissed: boolean

  @Column({ default: false })
  approvedForPublic: boolean

  @Column({ default: false })
  publicConsent: boolean

  @Column({ default: false })
  publicIdentityConsent: boolean

  @Column({ type: 'varchar', length: 255, nullable: true })
  publicDisplayName: string | null

  @Column({ type: 'varchar', length: 50, nullable: true })
  publicCrp: string | null

  @Column({ type: 'varchar', length: 120, nullable: true })
  publicSpecialty: string | null

  @Column({ type: 'varchar', length: 120, nullable: true })
  publicCity: string | null

  @Column({ type: 'varchar', length: 500, nullable: true })
  publicAvatarUrl: string | null

  @Column({ type: 'timestamptz', nullable: true })
  publicConsentAt: Date | null

  @Column({ type: 'varchar', length: 20, nullable: true })
  publicConsentVersion: string | null

  @CreateDateColumn()
  createdAt: Date
}
