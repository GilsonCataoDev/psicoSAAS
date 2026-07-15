import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { PatientAttachment } from './entities/patient-attachment.entity'
import { Patient } from './entities/patient.entity'
import { decrypt, encrypt } from '../../common/crypto/encrypt.util'

const MAX_ATTACHMENTS_PER_PATIENT = 50

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

    // O mimetype vem do cliente e pode mentir — valida a assinatura real do arquivo
    if (!contentMatchesMime(file.buffer, file.mimetype)) {
      throw new BadRequestException('Conteúdo do arquivo não corresponde ao formato declarado. Envie um PDF, JPG ou PNG válido.')
    }

    const saved = await this.repo.save(this.repo.create({
      patientId,
      psychologistId,
      filename: sanitizeFilename(file.originalname),
      mimeType: file.mimetype,
      size: file.size,
      data: encrypt(file.buffer.toString('base64')),
    }))
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
      select: ['id', 'filename', 'mimeType', 'data'],
    })
    if (!attachment) throw new NotFoundException('Documento não encontrado')
    return {
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      buffer: Buffer.from(decrypt(attachment.data), 'base64'),
    }
  }

  async remove(attachmentId: string, patientId: string, psychologistId: string): Promise<{ ok: true }> {
    const result = await this.repo.delete({ id: attachmentId, patientId, psychologistId })
    if (!result.affected) throw new NotFoundException('Documento não encontrado')
    return { ok: true }
  }

  private async assertPatientExists(patientId: string, psychologistId: string): Promise<void> {
    const exists = await this.patients.exist({ where: { id: patientId, psychologistId } })
    if (!exists) throw new NotFoundException('Pessoa não encontrada')
  }
}

/** Remove caracteres problemáticos do nome do arquivo mantendo a extensão legível */
function sanitizeFilename(name: string): string {
  // eslint-disable-next-line no-control-regex -- caracteres de controle são removidos de propósito
  const trimmed = name.normalize('NFC').replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').trim()
  return trimmed.slice(0, 180) || 'documento'
}

/** Verifica os magic bytes do buffer contra o MIME type declarado pelo cliente */
export function contentMatchesMime(buffer: Buffer, mimetype: string): boolean {
  if (!buffer || buffer.length < 8) return false
  switch (mimetype) {
    case 'application/pdf':
      return buffer.subarray(0, 4).toString('latin1') === '%PDF'
    case 'image/jpeg':
    case 'image/jpg':
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
    case 'image/png':
      return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    default:
      return false
  }
}
