import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { PatientAttachment } from './entities/patient-attachment.entity'
import { Patient } from './entities/patient.entity'
import { decrypt, encrypt } from '../../common/crypto/encrypt.util'
import { StorageService } from '../../common/storage/storage.service'
import { detectFileSignature } from '../../common/http/file-signature.util'

const MAX_ATTACHMENTS_PER_PATIENT = 50

/**
 * "r2" só é usado se ATTACHMENTS_STORAGE_DRIVER=r2 E o StorageService tiver
 * as credenciais privadas configuradas — caso contrário cai pro driver
 * padrão (Postgres) sem quebrar. Anexos já existentes no Postgres nunca são
 * migrados automaticamente; cada registro carrega seu próprio driver via
 * `data` (Postgres) ou `storageKey` (R2) preenchido.
 */
function attachmentsDriver(storage: StorageService): 'postgres' | 'r2' {
  if (process.env.ATTACHMENTS_STORAGE_DRIVER === 'r2' && storage.isPrivateConfigured()) return 'r2'
  return 'postgres'
}

export type AttachmentMetaDto = Pick<
  PatientAttachment,
  'id' | 'filename' | 'mimeType' | 'size' | 'createdAt'
>

@Injectable()
export class PatientAttachmentsService {
  constructor(
    @InjectRepository(PatientAttachment)
    private readonly repo: Repository<PatientAttachment>,
    @InjectRepository(Patient)
    private readonly patients: Repository<Patient>,
    private readonly storage: StorageService,
  ) {}

  async list(patientId: string, psychologistId: string): Promise<AttachmentMetaDto[]> {
    await this.assertPatientExists(patientId, psychologistId)
    return this.repo.find({
      where: { patientId, psychologistId },
      select: ['id', 'filename', 'mimeType', 'size', 'createdAt'],
      order: { createdAt: 'DESC' },
    })
  }

  async add(
    patientId: string,
    psychologistId: string,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
  ): Promise<AttachmentMetaDto> {
    await this.assertPatientExists(patientId, psychologistId)

    const count = await this.repo.count({ where: { patientId, psychologistId } })
    if (count >= MAX_ATTACHMENTS_PER_PATIENT) {
      throw new BadRequestException(`Limite de ${MAX_ATTACHMENTS_PER_PATIENT} documentos por paciente atingido`)
    }

    if (!detectFileSignature(file.buffer)) {
      throw new BadRequestException('O conteúdo do arquivo não corresponde a um PDF, JPG ou PNG válido')
    }

    const driver = attachmentsDriver(this.storage)
    const filename = sanitizeFilename(file.originalname)
    const base = this.repo.create({
      patientId,
      psychologistId,
      filename,
      mimeType: file.mimetype,
      size: file.size,
    })

    if (driver === 'r2') {
      // Isolamento por psicólogo reforçado na própria key do objeto no bucket.
      const saved = await this.repo.save({ ...base, data: null })
      const storageKey = `attachments/${psychologistId}/${patientId}/${saved.id}`
      const encryptedPayload = Buffer.from(encrypt(file.buffer.toString('base64')), 'utf8')
      await this.storage.uploadPrivate(storageKey, encryptedPayload, 'application/octet-stream')
      saved.storageKey = storageKey
      await this.repo.save(saved)
      return { id: saved.id, filename: saved.filename, mimeType: saved.mimeType, size: saved.size, createdAt: saved.createdAt }
    }

    const saved = await this.repo.save({ ...base, data: encrypt(file.buffer.toString('base64')), storageKey: null })
    return {
      id: saved.id,
      filename: saved.filename,
      mimeType: saved.mimeType,
      size: saved.size,
      createdAt: saved.createdAt,
    }
  }

  async download(
    attachmentId: string,
    patientId: string,
    psychologistId: string,
  ): Promise<{ filename: string; mimeType: string; buffer: Buffer }> {
    const attachment = await this.repo.findOne({
      where: { id: attachmentId, patientId, psychologistId },
      select: ['id', 'filename', 'mimeType', 'data', 'storageKey'],
    })
    if (!attachment) throw new NotFoundException('Documento não encontrado')

    if (attachment.storageKey) {
      const encryptedPayload = await this.storage.getObject(attachment.storageKey)
      return {
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        buffer: Buffer.from(decrypt(encryptedPayload.toString('utf8')), 'base64'),
      }
    }

    if (!attachment.data) throw new NotFoundException('Documento não encontrado')
    return {
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      buffer: Buffer.from(decrypt(attachment.data), 'base64'),
    }
  }

  async remove(attachmentId: string, patientId: string, psychologistId: string): Promise<{ ok: true }> {
    const attachment = await this.repo.findOne({
      where: { id: attachmentId, patientId, psychologistId },
      select: ['id', 'storageKey'],
    })
    if (!attachment) throw new NotFoundException('Documento não encontrado')

    const result = await this.repo.delete({ id: attachmentId, patientId, psychologistId })
    if (!result.affected) throw new NotFoundException('Documento não encontrado')

    if (attachment.storageKey) await this.storage.delete(attachment.storageKey)
    return { ok: true }
  }

  private async assertPatientExists(patientId: string, psychologistId: string): Promise<void> {
    const exists = await this.patients.exist({ where: { id: patientId, psychologistId } })
    if (!exists) throw new NotFoundException('Pessoa não encontrada')
  }
}

/** Remove caracteres problemáticos do nome do arquivo mantendo a extensão legível */
function sanitizeFilename(name: string): string {
  const trimmed = name.normalize('NFC').replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').trim()
  return trimmed.slice(0, 180) || 'documento'
}
