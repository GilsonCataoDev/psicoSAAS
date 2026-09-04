import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('nps_responses')
export class NpsResponse {
  @PrimaryGeneratedColumn('uuid') id: string
  @Column() userId: string
  @Column({ nullable: true }) patientId?: string
  @Column({ nullable: true }) sessionId?: string
  @Column({ unique: true }) token: string
  @Column({ nullable: true }) score?: number
  @Column({ type: 'text', nullable: true }) comment?: string
  @Column({ default: false }) responded: boolean
  @CreateDateColumn() createdAt: Date
}
