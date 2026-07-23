import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  CreateDateColumn, JoinColumn,
} from 'typeorm'
import { Patient } from './patient.entity'
import { User } from '../../auth/entities/user.entity'

/**
 * Documento anexado ao prontuário de um paciente (material clínico legado,
 * laudos, encaminhamentos recebidos etc.).
 * O conteúdo é criptografado (AES-256-GCM) antes de ir para o banco.
 */
@Entity('patient_attachments')
export class PatientAttachment {
  @PrimaryGeneratedColumn('uuid') id: string

  @Column() filename: string
  @Column() mimeType: string

  /** Tamanho original do arquivo em bytes (antes de base64 + criptografia) */
  @Column({ type: 'int' }) size: number

  /**
   * Conteúdo criptografado (driver Postgres) — select: false evita carregar
   * o blob em listagens. Nulo quando o conteúdo está em storageKey (R2).
   */
  @Column({ type: 'text', select: false, nullable: true }) data: string | null

  /** Key do objeto no bucket privado (driver R2) — nulo quando o conteúdo está em `data` */
  @Column({ type: 'varchar', nullable: true }) storageKey: string | null

  @Column() patientId: string
  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' }) patient: Patient

  @Column() psychologistId: string
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'psychologistId' }) psychologist: User

  @CreateDateColumn() createdAt: Date
}
