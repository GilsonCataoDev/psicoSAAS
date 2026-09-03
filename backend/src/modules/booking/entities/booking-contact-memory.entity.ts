import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

@Entity('booking_contact_memories')
@Index(['expiresAt'])
export class BookingContactMemory {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 64, unique: true, select: false })
  tokenHash: string

  @Column({ type: 'text' })
  patientName: string

  @Column({ type: 'text', nullable: true })
  patientEmail?: string

  @Column({ type: 'text', nullable: true })
  patientPhone?: string

  @Column({ type: 'timestamptz' })
  expiresAt: Date

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date
}
