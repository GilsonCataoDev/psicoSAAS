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

  @CreateDateColumn()
  createdAt: Date
}
