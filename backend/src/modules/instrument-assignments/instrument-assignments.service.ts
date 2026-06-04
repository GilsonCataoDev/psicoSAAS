import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { randomBytes } from 'crypto'
import { Repository } from 'typeorm'
import { InstrumentAssignment } from './entities/instrument-assignment.entity'
import { Patient } from '../patients/entities/patient.entity'
import { NotificationsService } from '../notifications/notifications.service'
import { encrypt, safeDecrypt } from '../../common/crypto/encrypt.util'

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
}

@Injectable()
export class InstrumentAssignmentsService {
  constructor(
    @InjectRepository(InstrumentAssignment)
    private readonly assignments: Repository<InstrumentAssignment>,
    @InjectRepository(Patient)
    private readonly patients: Repository<Patient>,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  async create(input: CreateAssignmentInput, psychologistId: string) {
    const patient = await this.patients.findOne({ where: { id: input.patientId, psychologistId } })
    if (!patient) throw new NotFoundException('Pessoa nao encontrada')
    if (!input.template?.trim()) throw new BadRequestException('Instrumento sem template')

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const assignment = await this.assignments.save(this.assignments.create({
      patientId: patient.id,
      psychologistId,
      token: randomBytes(24).toString('hex'),
      instrumentId: input.instrumentId,
      title: input.title,
      description: input.description,
      category: input.category,
      template: input.template,
      status: 'pending',
      expiresAt,
    }))

    const url = this.publicUrl(assignment.token)
    if (input.sendWhatsApp && patient.phone) {
      const first = patient.name.split(' ')[0]
      await this.notifications.sendDirectWhatsApp(
        patient.phone,
        `Ola, ${first}! Segue o formulario combinado para preencher com calma:\n\n${url}\n\nO link fica disponivel por 7 dias.`,
        psychologistId,
      )
    }

    return { ...this.toDto(assignment), url, patientName: patient.name, patientPhone: patient.phone ?? null }
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
      url: this.publicUrl(item.token),
    }))
  }

  async getPublic(token: string) {
    const assignment = await this.assignments.findOne({ where: { token }, relations: ['patient'] })
    if (!assignment) throw new NotFoundException('Formulario nao encontrado')
    if (assignment.status !== 'pending' || assignment.expiresAt.getTime() < Date.now()) {
      throw new ForbiddenException('Formulario expirado ou ja respondido')
    }

    return {
      token,
      title: assignment.title,
      description: assignment.description,
      patientName: assignment.patient?.name ?? null,
      expiresAt: assignment.expiresAt,
      fields: this.extractFields(assignment.template),
    }
  }

  async submit(token: string, answers: Record<string, string>) {
    const assignment = await this.assignments.findOne({ where: { token }, relations: ['patient'] })
    if (!assignment) throw new NotFoundException('Formulario nao encontrado')
    if (assignment.status !== 'pending' || assignment.expiresAt.getTime() < Date.now()) {
      throw new ForbiddenException('Formulario expirado ou ja respondido')
    }

    const fields = this.extractFields(assignment.template)
    const cleanAnswers = Object.fromEntries(
      fields.map(field => [field.id, String(answers?.[field.id] ?? '').trim().slice(0, 5000)]),
    )
    const responseText = this.buildResponseText(assignment, fields, cleanAnswers)

    assignment.status = 'completed'
    assignment.completedAt = new Date()
    assignment.responseText = encrypt(responseText)
    assignment.responseData = encrypt(JSON.stringify(cleanAnswers))
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
    const cleanAnswers = Object.fromEntries(
      fields.map(field => [field.id, String(answers?.[field.id] ?? '').trim().slice(0, 5000)]),
    )
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

  private buildResponseText(assignment: InstrumentAssignment, fields: InstrumentField[], answers: Record<string, string>) {
    return [
      assignment.title,
      '',
      `Paciente: ${assignment.patient?.name ?? 'Paciente'}`,
      `Respondido em: ${new Date().toLocaleString('pt-BR')}`,
      '',
      ...fields.map(field => `${field.label}: ${answers[field.id] ?? ''}`),
    ].join('\n')
  }

  private publicUrl(token: string): string {
    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'https://usecognia.com.br'
    return `${frontendUrl}/#/instrumentos/responder/${token}`
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
