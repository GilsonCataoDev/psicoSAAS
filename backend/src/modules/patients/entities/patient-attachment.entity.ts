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

  /** Conteúdo criptografado — select: false evita carregar o blob em listagens */
  @Column({ type: 'text', select: false }) data: string

  @Column() patientId: string
  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' }) patient: Patient

  @Column() psychologistId: string
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'psychologistId' }) psychologist: User

  @CreateDateColumn() createdAt: Date
}
