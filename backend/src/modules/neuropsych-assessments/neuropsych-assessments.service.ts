import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { randomBytes } from 'crypto'
import { encrypt, hashToken, safeDecrypt } from '../../common/crypto/encrypt.util'
import { Patient } from '../patients/entities/patient.entity'
import { formatCrpForDisplay } from '../auth/entities/user.entity'
import { InstrumentAssignment } from '../instrument-assignments/entities/instrument-assignment.entity'
import {
  CreateNeuropsychAssessmentDto, CreateNeuropsychBatteryItemDto,
  ListNeuropsychAssessmentsQueryDto,
  UpdateNeuropsychAssessmentDto, UpdateNeuropsychBatteryItemDto,
} from './dto/neuropsych-assessment.dto'
import { NeuropsychAssessment } from './entities/neuropsych-assessment.entity'
import { NeuropsychBatteryItem } from './entities/neuropsych-battery-item.entity'
import { buildNeuropsychAssessmentPdf } from './neuropsych-export.util'

const ACTIVE_STATUSES = ['planning', 'in_progress', 'integration'] as const
const ASSESSMENT_CLINICAL_FIELDS = [
  'referralQuestion', 'clinicalHistory', 'clinicalHypotheses',
  'qualitativeObservations', 'integrationDraft', 'professionalConclusion',
] as const
const ITEM_CLINICAL_FIELDS = ['purpose', 'resultSummary', 'qualitativeNotes'] as const

@Injectable()
export class NeuropsychAssessmentsService {
  constructor(
    @InjectRepository(NeuropsychAssessment) private readonly assessments: Repository<NeuropsychAssessment>,
    @InjectRepository(NeuropsychBatteryItem) private readonly items: Repository<NeuropsychBatteryItem>,
    @InjectRepository(Patient) private readonly patients: Repository<Patient>,
    @InjectRepository(InstrumentAssignment) private readonly instruments: Repository<InstrumentAssignment>,
  ) {}

  async list(psychologistId: string, query: ListNeuropsychAssessmentsQueryDto = {}) {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 50
    const where: any = { psychologistId }
    if (query.status) where.status = query.status
    if (query.patientId) where.patientId = query.patientId

    const [assessments, total] = await this.assessments.findAndCount({
      where,
      relations: ['patient', 'batteryItems'],
      // A listagem carrega somente metadados e status; conteúdo clínico fica restrito ao detalhe.
      select: {
        id: true, psychologistId: true, patientId: true, status: true,
        evaluatedDomains: true, startedAt: true, targetCompletionDate: true,
        completedAt: true, version: true, createdAt: true, updatedAt: true,
        patient: { id: true, name: true, avatarColor: true },
        batteryItems: { id: true, status: true },
      } as any,
      order: { updatedAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })
    return {
      data: assessments.map(assessment => this.toDto(assessment, false)),
      total,
      page,
      pageSize,
    }
  }

  async findOne(id: string, psychologistId: string) {
    const assessment = await this.findRaw(id, psychologistId, true)
    return this.toDto(assessment, true)
  }

  async create(input: CreateNeuropsychAssessmentDto, psychologistId: string) {
    const patient = await this.patients.findOne({ where: { id: input.patientId, psychologistId } })
    if (!patient) throw new NotFoundException('Pessoa não encontrada')

    const active = await this.assessments.findOne({
      where: { patientId: patient.id, psychologistId, status: In([...ACTIVE_STATUSES]) },
    })
    if (active) throw new BadRequestException('Esta pessoa já possui uma avaliação neuropsicológica ativa')

    let saved: NeuropsychAssessment
    try {
      saved = await this.assessments.save(this.assessments.create({
        ...this.encryptFields(input, ASSESSMENT_CLINICAL_FIELDS),
        patientId: patient.id,
        psychologistId,
        startedAt: input.startedAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
        evaluatedDomains: (input.evaluatedDomains ?? []) as any,
        status: 'planning',
      }))
    } catch (error: any) {
      // Corrida entre requisições concorrentes: o check acima passou pros dois, mas o
      // indice unico parcial (UQ_neuropsych_assessments_active_patient) barra o segundo insert.
      if (error?.code === '23505') throw new BadRequestException('Esta pessoa já possui uma avaliação neuropsicológica ativa')
      throw error
    }

    if (patient.careMode !== 'neuropsychological_assessment') {
      patient.careMode = 'neuropsychological_assessment'
      await this.patients.save(patient)
    }
    return this.findOne(saved.id, psychologistId)
  }

  async update(id: string, input: UpdateNeuropsychAssessmentDto, psychologistId: string) {
    const assessment = await this.findRaw(id, psychologistId)
    if (input.patientId && input.patientId !== assessment.patientId) {
      throw new BadRequestException('Não é possível trocar a pessoa de uma avaliação existente')
    }
    if (input.version && input.version !== assessment.version) {
      throw new BadRequestException('Esta avaliação foi alterada em outra tela. Recarregue antes de salvar.')
    }

    const changes: any = this.encryptFields(input, ASSESSMENT_CLINICAL_FIELDS)
    delete changes.patientId
    delete changes.version
    if (changes.status === 'completed' && !assessment.completedAt) changes.completedAt = new Date()
    if (changes.status && ACTIVE_STATUSES.includes(changes.status)) changes.completedAt = null
    Object.assign(assessment, changes)
    await this.assessments.save(assessment)
    return this.findOne(id, psychologistId)
  }

  async addItem(assessmentId: string, input: CreateNeuropsychBatteryItemDto, psychologistId: string) {
    const assessment = await this.findRaw(assessmentId, psychologistId)
    await this.assertInstrument(input.instrumentAssignmentId, assessment.patientId, psychologistId)
    const saved = await this.items.save(this.items.create({
      ...this.encryptFields(input, ITEM_CLINICAL_FIELDS),
      domains: input.domains as any,
      assessmentId,
      patientId: assessment.patientId,
      psychologistId,
      status: 'planned',
      sortOrder: input.sortOrder ?? 0,
    }))
    return this.itemToDto(saved)
  }

  async updateItem(
    assessmentId: string,
    itemId: string,
    input: UpdateNeuropsychBatteryItemDto,
    psychologistId: string,
  ) {
    const item = await this.items.findOne({ where: { id: itemId, assessmentId, psychologistId } })
    if (!item) throw new NotFoundException('Item da bateria não encontrado')
    await this.assertInstrument(input.instrumentAssignmentId, item.patientId, psychologistId)
    const changes: any = this.encryptFields(input, ITEM_CLINICAL_FIELDS)
    if (changes.status === 'applied' && !changes.appliedDate && !item.appliedDate) {
      changes.appliedDate = new Date().toISOString().slice(0, 10)
    }
    Object.assign(item, changes)
    const saved = await this.items.save(item)
    return this.itemToDto(saved)
  }

  /**
   * Exclui a avaliação e a bateria vinculada. Itens de bateria já têm ON
   * DELETE CASCADE no banco; anexos do paciente ligados a esta avaliação
   * ficam desvinculados (SET NULL), não excluídos — pertencem ao paciente,
   * não à avaliação.
   */
  async remove(id: string, psychologistId: string) {
    const assessment = await this.findRaw(id, psychologistId)
    await this.assessments.remove(assessment)
    return { ok: true as const }
  }

  async removeItem(assessmentId: string, itemId: string, psychologistId: string) {
    const result = await this.items.delete({ id: itemId, assessmentId, psychologistId })
    if (!result.affected) throw new NotFoundException('Item da bateria não encontrado')
    return { ok: true as const }
  }

  async exportPdf(
    id: string,
    psychologistId: string,
    psychologistName: string,
    psychologistCrp: string,
  ): Promise<{ filename: string; stream: PDFKit.PDFDocument }> {
    const assessment = await this.findRaw(id, psychologistId, true)
    const dto = this.toDto(assessment, true)

    const stream = buildNeuropsychAssessmentPdf(dto as any, psychologistName, psychologistCrp || 'não informado')

    const safeName = dto.patient.name.replace(/[^a-zA-Z0-9À-ɏ\s]/g, '').trim().replace(/\s+/g, '_')
    const filename = `Laudo_Avaliacao_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`
    return { filename, stream }
  }

  /** Gera um link publico (token opaco) para o laudo em PDF, sem exigir login do destinatario. */
  async createShareLink(id: string, psychologistId: string): Promise<{ url: string }> {
    const assessment = await this.findRaw(id, psychologistId)
    const token = randomBytes(32).toString('base64url')
    assessment.shareTokenHash = hashToken(token)
    assessment.shareTokenCreatedAt = new Date()
    await this.assessments.save(assessment)

    const baseUrl = (process.env.FRONTEND_URL || process.env.PUBLIC_APP_URL || 'https://usecognia.com.br').replace(/\/$/, '')
    return { url: `${baseUrl}/laudo/${token}` }
  }

  async revokeShareLink(id: string, psychologistId: string) {
    const assessment = await this.findRaw(id, psychologistId)
    assessment.shareTokenHash = null
    assessment.shareTokenCreatedAt = null
    await this.assessments.save(assessment)
    return { ok: true as const }
  }

  async exportPdfByShareToken(token: string): Promise<{ filename: string; stream: PDFKit.PDFDocument }> {
    if (!token || token.length < 32) throw new NotFoundException('Link nao encontrado')
    const assessment = await this.assessments.findOne({
      where: { shareTokenHash: hashToken(token) },
      relations: ['patient', 'batteryItems', 'psychologist'],
    })
    if (!assessment) throw new NotFoundException('Link nao encontrado')

    const configuredTtl = Number(process.env.NEUROPSYCH_SHARE_TOKEN_TTL_DAYS)
    const ttlDays = Number.isFinite(configuredTtl) && configuredTtl > 0 ? configuredTtl : 14
    const createdAt = assessment.shareTokenCreatedAt
    if (!createdAt || Date.now() - new Date(createdAt).getTime() > ttlDays * 24 * 60 * 60 * 1000) {
      throw new NotFoundException('Link expirado. Solicite um novo ao profissional responsavel.')
    }

    const dto = this.toDto(assessment, true)
    const psychologistName = assessment.psychologist?.name ?? 'Profissional'
    const psychologistCrp = formatCrpForDisplay(assessment.psychologist ?? { crp: null, isStudent: false }) ?? 'nao informado'
    const stream = buildNeuropsychAssessmentPdf(dto as any, psychologistName, psychologistCrp)

    const safeName = dto.patient.name.replace(/[^a-zA-Z0-9À-ɏ\s]/g, '').trim().replace(/\s+/g, '_')
    const filename = `Laudo_Avaliacao_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`
    return { filename, stream }
  }

  private async findRaw(id: string, psychologistId: string, withItems = false) {
    const assessment = await this.assessments.findOne({
      where: { id, psychologistId },
      relations: withItems ? ['patient', 'batteryItems'] : ['patient'],
      ...(withItems ? { order: { batteryItems: { sortOrder: 'ASC', createdAt: 'ASC' } } as any } : {}),
    })
    if (!assessment) throw new NotFoundException('Avaliação não encontrada')
    return assessment
  }

  private async assertInstrument(instrumentId: string | undefined, patientId: string, psychologistId: string) {
    if (!instrumentId) return
    const exists = await this.instruments.exist({ where: { id: instrumentId, patientId, psychologistId } })
    if (!exists) throw new NotFoundException('Instrumento vinculado não encontrado')
  }

  private encryptFields<T extends object>(input: T, fields: readonly string[]): T {
    const output: any = { ...input }
    for (const field of fields) {
      if (Object.prototype.hasOwnProperty.call(input, field)) {
        const value = (input as any)[field]
        output[field] = typeof value === 'string' && value.trim() ? encrypt(value.trim()) : null
      }
    }
    return output
  }

  private toDto(assessment: NeuropsychAssessment, includeClinical: boolean) {
    const dto: any = {
      ...assessment,
      patient: assessment.patient ? {
        id: assessment.patient.id,
        name: assessment.patient.name,
        avatarColor: assessment.patient.avatarColor,
      } : undefined,
      batteryProgress: {
        total: assessment.batteryItems?.length ?? 0,
        applied: assessment.batteryItems?.filter(item => ['applied', 'integrated'].includes(item.status)).length ?? 0,
      },
    }
    delete dto.psychologist
    if (includeClinical) {
      dto.batteryItems = (assessment.batteryItems ?? []).map(item => this.itemToDto(item, true))
      for (const field of ASSESSMENT_CLINICAL_FIELDS) dto[field] = safeDecrypt((assessment as any)[field]) ?? ''
    } else {
      delete dto.batteryItems
      for (const field of ASSESSMENT_CLINICAL_FIELDS) delete dto[field]
    }
    return dto
  }

  private itemToDto(item: NeuropsychBatteryItem, includeClinical = true) {
    const dto: any = { ...item }
    for (const field of ITEM_CLINICAL_FIELDS) {
      if (includeClinical) dto[field] = safeDecrypt((item as any)[field]) ?? ''
      else delete dto[field]
    }
    delete dto.psychologist
    return dto
  }
}
