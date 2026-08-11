import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { randomBytes } from 'crypto'
import { addDays, addMonths, addWeeks } from 'date-fns'
import { Repository } from 'typeorm'
import { InstrumentAssignment } from './entities/instrument-assignment.entity'
import { InstrumentSchedule, InstrumentRecurrence } from './entities/instrument-schedule.entity'
import { Patient } from '../patients/entities/patient.entity'
import { NotificationsService } from '../notifications/notifications.service'
import { encrypt, hashToken, safeDecrypt } from '../../common/crypto/encrypt.util'

type InstrumentField = {
  id: string
  label: string
  type: 'text' | 'textarea' | 'date' | 'email' | 'tel' | 'number' | 'select'
  options?: string[]
}

type CreateAssignmentInput = {
  patientId: string
  instrumentId: string
  title: string
  description?: string
  category: string
  template: string
  sendWhatsApp?: boolean
  recurrence?: InstrumentRecurrence
}

@Injectable()
export class InstrumentAssignmentsService {
  constructor(
    @InjectRepository(InstrumentAssignment)
    private readonly assignments: Repository<InstrumentAssignment>,
    @InjectRepository(InstrumentSchedule)
    private readonly schedules: Repository<InstrumentSchedule>,
    @InjectRepository(Patient)
    private readonly patients: Repository<Patient>,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  async create(input: CreateAssignmentInput, psychologistId: string) {
    const patient = await this.patients.findOne({ where: { id: input.patientId, psychologistId } })
    if (!patient) throw new NotFoundException('Pessoa nao encontrada')
    if (!input.template?.trim()) throw new BadRequestException('Instrumento sem template')

    const { assignment, url, whatsAppSent, whatsAppError } = await this.createOccurrence(input, patient, psychologistId)

    if (input.recurrence) {
      await this.schedules.save(this.schedules.create({
        patientId: patient.id,
        psychologistId,
        instrumentId: input.instrumentId,
        title: input.title,
        description: input.description,
        category: input.category,
        template: input.template,
        sendWhatsApp: input.sendWhatsApp ?? false,
        recurrence: input.recurrence,
        nextSendAt: this.nextOccurrence(new Date(), input.recurrence),
        active: true,
        lastAssignmentId: assignment.id,
      }))
    }

    return {
      ...this.toDto(assignment),
      url,
      patientName: patient.name,
      patientPhone: patient.phone ?? null,
      whatsAppSent,
      whatsAppError,
    }
  }

  /** Cria uma unica ocorrencia (assignment + envio opcional por WhatsApp), usado tanto na criacao manual quanto pelo InstrumentRecurrenceJob. */
  async createOccurrence(
    input: Pick<CreateAssignmentInput, 'instrumentId' | 'title' | 'description' | 'category' | 'template' | 'sendWhatsApp'>,
    patient: Patient,
    psychologistId: string,
  ) {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const publicToken = randomBytes(24).toString('hex')
    const assignment = await this.assignments.save(this.assignments.create({
      patientId: patient.id,
      psychologistId,
      token: hashToken(publicToken),
      tokenEncrypted: encrypt(publicToken),
      instrumentId: input.instrumentId,
      title: input.title,
      description: input.description,
      category: input.category,
      template: input.template,
      status: 'pending',
      expiresAt,
    }))

    const url = this.publicUrl(publicToken)

    let whatsAppSent = false
    let whatsAppError: string | undefined

    if (input.sendWhatsApp && patient.phone) {
      const first = patient.name.split(' ')[0]
      const result = await this.notifications.sendDirectWhatsApp(
        patient.phone,
        `Ola, ${first}. A profissional enviou um formulario pelo UseCognia para voce responder com calma.\n\nAcesse: ${url}\n\nO link e individual, seguro e expira em 7 dias. Responda em um ambiente reservado.`,
        psychologistId,
        { type: 'Formulario', patientId: patient.id, patientName: patient.name, verifyDelivery: false },
      )
      whatsAppSent = result.sent
      if (!result.sent) whatsAppError = result.error
    }

    return { assignment, url, whatsAppSent, whatsAppError }
  }

  nextOccurrence(from: Date, recurrence: InstrumentRecurrence): Date {
    if (recurrence === 'weekly') return addWeeks(from, 1)
    if (recurrence === 'biweekly') return addDays(from, 14)
    return addMonths(from, 1)
  }

  async findSchedules(psychologistId: string, patientId?: string) {
    const items = await this.schedules.find({
      where: { psychologistId, ...(patientId ? { patientId } : {}) },
      relations: ['patient'],
      order: { createdAt: 'DESC' },
    })
    return items.map(item => ({
      id: item.id,
      instrumentId: item.instrumentId,
      title: item.title,
      category: item.category,
      recurrence: item.recurrence,
      nextSendAt: item.nextSendAt,
      active: item.active,
      patientId: item.patientId,
      patientName: item.patient?.name ?? null,
      createdAt: item.createdAt,
    }))
  }

  async setScheduleActive(id: string, psychologistId: string, active: boolean) {
    const schedule = await this.schedules.findOne({ where: { id, psychologistId } })
    if (!schedule) throw new NotFoundException('Recorrencia nao encontrada')
    schedule.active = active
    await this.schedules.save(schedule)
    return { id: schedule.id, active: schedule.active }
  }

  async deleteSchedule(id: string, psychologistId: string) {
    const schedule = await this.schedules.findOne({ where: { id, psychologistId } })
    if (!schedule) throw new NotFoundException('Recorrencia nao encontrada')
    await this.schedules.remove(schedule)
    return { ok: true }
  }

  async findOwned(id: string, psychologistId: string): Promise<InstrumentAssignment> {
    const assignment = await this.assignments.findOne({ where: { id, psychologistId } })
    if (!assignment) throw new NotFoundException('Resposta nao encontrada')
    return assignment
  }

  async findMine(psychologistId: string, patientId?: string) {
    const items = await this.assignments.find({
      where: { psychologistId, ...(patientId ? { patientId } : {}) },
      relations: ['patient'],
      order: { createdAt: 'DESC' },
      take: 100,
    })
    return items.map(item => ({
      ...this.toDto(item),
      patientName: item.patient?.name ?? null,
      url: this.publicUrl(this.readPublicToken(item)),
    }))
  }

  async getPublic(token: string) {
    const assignment = await this.findByPublicToken(token)
    if (!assignment) throw new NotFoundException('Formulario nao encontrado')
    if (assignment.status !== 'pending' || assignment.expiresAt.getTime() < Date.now()) {
      throw new ForbiddenException('Formulario expirado ou ja respondido')
    }

    return {
      token,
      instrumentId: assignment.instrumentId,
      category: assignment.category,
      title: assignment.title,
      description: assignment.description,
      patientName: assignment.patient?.name ?? null,
      expiresAt: assignment.expiresAt,
      fields: this.extractFields(assignment.template),
    }
  }

  async submit(token: string, answers: Record<string, string>, score?: number, scoreDetails?: string) {
    const assignment = await this.findByPublicToken(token)
    if (!assignment) throw new NotFoundException('Formulario nao encontrado')
    if (assignment.status !== 'pending' || assignment.expiresAt.getTime() < Date.now()) {
      throw new ForbiddenException('Formulario expirado ou ja respondido')
    }

    const fields = this.extractFields(assignment.template)
    const cleanAnswers = this.cleanAnswers(fields, answers)
    const responseText = this.buildResponseText(assignment, fields, cleanAnswers)

    assignment.status = 'completed'
    assignment.completedAt = new Date()
    assignment.responseText = encrypt(responseText)
    assignment.responseData = encrypt(JSON.stringify(cleanAnswers))
    if (score != null) assignment.score = score
    if (scoreDetails) assignment.scoreDetails = encrypt(scoreDetails)
    await this.assignments.save(assignment)

    return { ok: true }
  }

  async updateAnswers(id: string, answers: Record<string, string>, psychologistId: string) {
    const assignment = await this.assignments.findOne({
      where: { id, psychologistId },
      relations: ['patient'],
    })
    if (!assignment) throw new NotFoundException('Resposta nao encontrada')
    if (assignment.status !== 'completed') throw new BadRequestException('Formulario ainda nao respondido')

    const fields = this.extractFields(assignment.template)
    const cleanAnswers = this.cleanAnswers(fields, answers)
    assignment.responseData = encrypt(JSON.stringify(cleanAnswers))
    assignment.responseText = encrypt(this.buildResponseText(assignment, fields, cleanAnswers))
    await this.assignments.save(assignment)
    return this.toDto(assignment)
  }

  private extractFields(template: string): InstrumentField[] {
    return template
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.endsWith(':') && line.length > 1)
      .map((line, index) => ({
        id: `field_${index}`,
        label: line.replace(/:$/, ''),
        ...this.inferField(line.replace(/:$/, '')),
      }))
  }

  private inferField(label: string): Pick<InstrumentField, 'type' | 'options'> {
    const normalized = label.toLowerCase()
    if (normalized.includes('data de nascimento') || normalized === 'data') return { type: 'date' }
    if (normalized.includes('e-mail') || normalized.includes('email')) return { type: 'email' }
    if (normalized.includes('telefone') || normalized.includes('whatsapp')) return { type: 'tel' }
    if (normalized === 'idade') return { type: 'number' }
    if (normalized.includes('sexo/gênero') || normalized.includes('sexo/genero')) {
      return { type: 'select', options: ['Feminino', 'Masculino', 'Não binário', 'Prefiro não informar', 'Outro'] }
    }
    if (normalized === 'estado civil') {
      return { type: 'select', options: ['Solteiro(a)', 'Casado(a)', 'União estável', 'Divorciado(a)', 'Viúvo(a)', 'Outro'] }
    }
    const longAnswerTerms = ['queixa', 'histórico', 'historia', 'objetivo', 'observa', 'relacionamento', 'dinâmica', 'eventos', 'problema', 'tentativas', 'rede de apoio', 'tratamento']
    return { type: longAnswerTerms.some(term => normalized.includes(term)) ? 'textarea' : 'text' }
  }

  private cleanAnswers(fields: InstrumentField[], answers: Record<string, string>): Record<string, string> {
    if (fields.length > 0) {
      return Object.fromEntries(
        fields.map(field => [field.id, String(answers?.[field.id] ?? '').trim().slice(0, 5000)]),
      )
    }

    return Object.fromEntries(
      Object.entries(answers ?? {})
        .slice(0, 200)
        .filter(([key]) => /^[a-zA-Z0-9_-]{1,80}$/.test(key))
        .map(([key, value]) => [key, String(value ?? '').trim().slice(0, 5000)]),
    )
  }

  private buildResponseText(assignment: InstrumentAssignment, fields: InstrumentField[], answers: Record<string, string>) {
    const answerLines = fields.length > 0
      ? fields.map(field => `${field.label}: ${answers[field.id] ?? ''}`)
      : Object.entries(answers).map(([key, value]) => `${key}: ${value}`)

    return [
      assignment.title,
      '',
      `Paciente: ${assignment.patient?.name ?? 'Paciente'}`,
      `Respondido em: ${new Date().toLocaleString('pt-BR')}`,
      '',
      ...answerLines,
    ].join('\n')
  }

  private async findByPublicToken(token: string): Promise<InstrumentAssignment | null> {
    return this.assignments.findOne({
      where: [
        { token: hashToken(token) },
        { token },
      ],
      relations: ['patient'],
    })
  }

  private readPublicToken(item: InstrumentAssignment): string {
    return item.tokenEncrypted ? (safeDecrypt(item.tokenEncrypted) ?? item.token) : item.token
  }

  // Link só circula por WhatsApp (envio automático ou copiado pelo psicólogo pra colar no WhatsApp) — utm_source fixo aqui é seguro.
  private publicUrl(token: string): string {
    const frontendUrl = (this.config.get<string>('FRONTEND_URL') ?? 'https://usecognia.com.br').replace(/\/$/, '')
    return `${frontendUrl}/instrumentos/responder/${token}?utm_source=whatsapp&utm_medium=message`
  }

  private toDto(item: InstrumentAssignment) {
    const fields = this.extractFields(item.template)
    return {
      id: item.id,
      instrumentId: item.instrumentId,
      title: item.title,
      description: item.description,
      category: item.category,
      status: item.status,
      expiresAt: item.expiresAt,
      completedAt: item.completedAt,
      responseText: item.responseText ? safeDecrypt(item.responseText) : null,
      score: item.score ?? null,
      scoreDetails: item.scoreDetails ? safeDecrypt(item.scoreDetails) : null,
      fields,
      answers: this.decryptAnswers(item.responseData, item.responseText, fields),
      createdAt: item.createdAt,
    }
  }

  private decryptAnswers(value: string | undefined, responseText: string | undefined, fields: InstrumentField[]): Record<string, string> | null {
    if (value) {
      try {
        return JSON.parse(safeDecrypt(value))
      } catch {
        // Falls back to the legacy text format below.
      }
    }
    if (!responseText) return null
    const text = safeDecrypt(responseText)
    return Object.fromEntries(fields.map(field => {
      const prefix = `${field.label}:`
      const line = text.split('\n').find(item => item.startsWith(prefix))
      return [field.id, line?.slice(prefix.length).trim() ?? '']
    }))
  }
}
