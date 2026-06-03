import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { randomBytes } from 'crypto'
import { Repository } from 'typeorm'
import { InstrumentAssignment } from './entities/instrument-assignment.entity'
import { Patient } from '../patients/entities/patient.entity'
import { Session } from '../sessions/entities/session.entity'
import { NotificationsService } from '../notifications/notifications.service'
import { encrypt, safeDecrypt } from '../../common/crypto/encrypt.util'

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
    @InjectRepository(Session)
    private readonly sessions: Repository<Session>,
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

  async findMine(psychologistId: string) {
    const items = await this.assignments.find({
      where: { psychologistId },
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
    const responseText = [
      assignment.title,
      '',
      `Paciente: ${assignment.patient?.name ?? 'Paciente'}`,
      `Respondido em: ${new Date().toLocaleString('pt-BR')}`,
      '',
      ...fields.map(field => `${field.label}: ${String(answers?.[field.id] ?? '').trim()}`),
    ].join('\n')

    assignment.status = 'completed'
    assignment.completedAt = new Date()
    assignment.responseText = encrypt(responseText)
    await this.assignments.save(assignment)

    await this.sessions.save(this.sessions.create({
      patientId: assignment.patientId,
      psychologistId: assignment.psychologistId,
      date: new Date().toISOString().slice(0, 10),
      duration: 0,
      summary: encrypt(`Resposta de instrumento recebida\n\n${responseText}`),
      paymentStatus: 'waived',
      tags: ['instrumento', assignment.instrumentId],
    }))

    return { ok: true }
  }

  private extractFields(template: string): Array<{ id: string; label: string }> {
    return template
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.endsWith(':') && line.length > 1)
      .map((line, index) => ({
        id: `field_${index}`,
        label: line.replace(/:$/, ''),
      }))
  }

  private publicUrl(token: string): string {
    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'https://usecognia.com.br'
    return `${frontendUrl}/#/instrumentos/responder/${token}`
  }

  private toDto(item: InstrumentAssignment) {
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
      createdAt: item.createdAt,
    }
  }
}
