import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { createHmac } from 'crypto'
import { Repository } from 'typeorm'
import { Patient } from '../patients/entities/patient.entity'
import { AiTextUsage } from '../sessions/ai.service'
import { ClinicalAiDraft, ClinicalAiDraftKind } from './entities/clinical-ai-draft.entity'

@Injectable()
export class ClinicalAiDraftService {
  constructor(
    @InjectRepository(ClinicalAiDraft) private readonly drafts: Repository<ClinicalAiDraft>,
    @InjectRepository(Patient) private readonly patients: Repository<Patient>,
  ) {}

  async create(input: {
    psychologistId: string
    patientId: string
    kind: ClinicalAiDraftKind
    sourceText: string
    content: string
    usage: AiTextUsage
    promptVersion: string
  }): Promise<ClinicalAiDraft> {
    await this.assertPatient(input.psychologistId, input.patientId)
    return this.drafts.save(this.drafts.create({
      psychologistId: input.psychologistId,
      patientId: input.patientId,
      kind: input.kind,
      content: input.content,
      sourceHash: this.hash(input.sourceText),
      model: input.usage.model,
      promptVersion: input.promptVersion,
      inputTokens: input.usage.inputTokens,
      outputTokens: input.usage.outputTokens,
      costUsdMicros: input.usage.costUsdMicros,
    }))
  }

  async acceptForSession(id: string, psychologistId: string, patientId: string, sessionId: string): Promise<void> {
    const draft = await this.drafts.findOne({ where: { id, psychologistId, patientId } })
    if (!draft) throw new NotFoundException('Rascunho de IA nao encontrado')
    if (draft.status !== 'generated') throw new BadRequestException('Este rascunho de IA ja foi revisado')
    draft.status = 'accepted'
    draft.sessionId = sessionId
    draft.reviewedAt = new Date()
    await this.drafts.save(draft)
  }

  async discard(id: string, psychologistId: string): Promise<{ discarded: true }> {
    const draft = await this.drafts.findOne({ where: { id, psychologistId } })
    if (!draft) throw new NotFoundException('Rascunho de IA nao encontrado')
    draft.status = 'discarded'
    draft.reviewedAt = new Date()
    await this.drafts.save(draft)
    return { discarded: true }
  }

  async getPatient(psychologistId: string, patientId: string): Promise<Patient> {
    const patient = patientId ? await this.patients.findOne({ where: { id: patientId, psychologistId } }) : null
    if (!patient) {
      throw new BadRequestException('Paciente invalido para este rascunho')
    }
    return patient
  }

  async assertCanAccept(id: string, psychologistId: string, patientId: string): Promise<void> {
    const draft = await this.drafts.findOne({ where: { id, psychologistId, patientId } })
    if (!draft) throw new NotFoundException('Rascunho de IA nao encontrado')
    if (draft.status !== 'generated') throw new BadRequestException('Este rascunho de IA ja foi revisado')
  }

  private async assertPatient(psychologistId: string, patientId: string): Promise<void> {
    await this.getPatient(psychologistId, patientId)
  }

  private hash(value: string): string {
    const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET
    if (!secret) throw new Error('ENCRYPTION_KEY ou JWT_SECRET ausente')
    return createHmac('sha256', secret).update(value).digest('hex')
  }
}
