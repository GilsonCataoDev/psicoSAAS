import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import PDFDocument = require('pdfkit')
import { safeDecrypt } from '../../common/crypto/encrypt.util'
import { User } from '../auth/entities/user.entity'
import { Patient } from '../patients/entities/patient.entity'
import { Appointment } from '../appointments/entities/appointment.entity'
import { Session } from '../sessions/entities/session.entity'
import { FinancialRecord } from '../financial/entities/financial-record.entity'
import { Document } from '../documents/entities/document.entity'
import { AvailabilitySlot } from '../availability/entities/availability-slot.entity'
import { BlockedDate } from '../availability/entities/blocked-date.entity'
import { BookingPage } from '../booking/entities/booking-page.entity'
import { Booking } from '../booking/entities/booking.entity'
import { Subscription } from '../billing/entities/subscription.entity'

type EncryptedProntuario = {
  __encrypted: 'psicosaas.prontuario.v1'
  data: string
}

@Injectable()
export class DataExportService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Patient) private readonly patients: Repository<Patient>,
    @InjectRepository(Appointment) private readonly appointments: Repository<Appointment>,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    @InjectRepository(FinancialRecord) private readonly financial: Repository<FinancialRecord>,
    @InjectRepository(Document) private readonly documents: Repository<Document>,
    @InjectRepository(AvailabilitySlot) private readonly availability: Repository<AvailabilitySlot>,
    @InjectRepository(BlockedDate) private readonly blockedDates: Repository<BlockedDate>,
    @InjectRepository(BookingPage) private readonly bookingPages: Repository<BookingPage>,
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(Subscription) private readonly subscriptions: Repository<Subscription>,
  ) {}

  async buildExport(userId: string) {
    const user = await this.users.findOne({ where: { id: userId } })
    if (!user) throw new NotFoundException('Usuario nao encontrado')

    const [
      patients,
      appointments,
      sessions,
      financialRecords,
      documents,
      availabilitySlots,
      blockedDates,
      bookingPage,
      bookings,
      subscriptions,
    ] = await Promise.all([
      this.patients.find({ where: { psychologistId: userId }, order: { name: 'ASC' } }),
      this.appointments.find({ where: { psychologistId: userId }, order: { date: 'ASC', time: 'ASC' } }),
      this.sessions.find({ where: { psychologistId: userId }, order: { date: 'DESC' } }),
      this.financial.find({ where: { psychologistId: userId }, order: { createdAt: 'DESC' } }),
      this.documents.find({ where: { userId }, order: { createdAt: 'DESC' } }),
      this.availability.find({ where: { psychologistId: userId }, order: { weekday: 'ASC', startTime: 'ASC' } }),
      this.blockedDates.find({ where: { psychologistId: userId }, order: { date: 'ASC' } }),
      this.bookingPages.findOne({ where: { psychologistId: userId } }),
      this.bookings.find({ where: { psychologistId: userId }, order: { date: 'DESC', time: 'DESC' } }),
      this.subscriptions.find({ where: { userId }, order: { createdAt: 'DESC' } }),
    ])

    return {
      format: 'usecognia.data-export.v1',
      exportedAt: new Date().toISOString(),
      owner: this.cleanUser(user),
      subscription: subscriptions.map(this.cleanSubscription),
      patients: patients.map((patient) => this.cleanPatient(patient)),
      appointments,
      sessions: sessions.map((session) => this.cleanSession(session)),
      financialRecords,
      documents: documents.map(this.cleanDocument),
      availability: {
        weeklySlots: availabilitySlots,
        blockedDates,
      },
      publicBooking: {
        page: bookingPage,
        requests: bookings,
      },
    }
  }

  async buildPdfExport(userId: string): Promise<Buffer> {
    const payload = await this.buildExport(userId)
    const pdf = new PDFDocument({
      size: 'A4',
      margin: 48,
      bufferPages: true,
      info: {
        Title: 'Exportacao de dados UseCognia',
        Author: payload.owner?.name ?? 'UseCognia',
        Subject: 'Exportacao completa de dados da conta',
        Keywords: 'UseCognia, exportacao, dados, LGPD',
      },
    })
    const done = this.collectPdf(pdf)

    const pageWidth = pdf.page.width
    const pageHeight = pdf.page.height
    const left = 48
    const right = pageWidth - 48
    const contentWidth = right - left
    const ink = '#1C1C1A'
    const muted = '#6F6F68'
    const sage = '#5B3EFF'
    const line = '#E8E8E6'

    const sectionTitle = (title: string) => {
      if (pdf.y > pageHeight - 130) pdf.addPage()
      pdf.moveDown(1.1)
      pdf.fillColor(sage).font('Helvetica-Bold').fontSize(13).text(title, left, pdf.y)
      pdf.moveTo(left, pdf.y + 4).lineTo(right, pdf.y + 4).strokeColor(line).lineWidth(1).stroke()
      pdf.moveDown(0.9)
    }

    const row = (label: string, value: string | number | null | undefined) => {
      const y = pdf.y
      pdf.fillColor(muted).font('Helvetica-Bold').fontSize(8.5).text(label, left, y, { width: 150 })
      pdf.fillColor(ink).font('Helvetica').fontSize(9).text(this.formatPdfValue(value), left + 158, y, {
        width: contentWidth - 158,
      })
      pdf.moveDown(0.45)
    }

    const writeJsonBlock = (title: string, value: unknown) => {
      sectionTitle(title)
      const json = JSON.stringify(value, null, 2)
      pdf.fillColor(ink).font('Courier').fontSize(6.8).text(json, {
        width: contentWidth,
        lineGap: 1,
      })
    }

    const exportedAt = new Date(payload.exportedAt)
    pdf.fillColor(sage).font('Helvetica-Bold').fontSize(11).text('UseCognia', left, 56)
    pdf.fillColor(ink).font('Helvetica-Bold').fontSize(24).text('Exportacao de dados', left, 84)
    pdf.fillColor(muted).font('Helvetica').fontSize(10)
      .text('Relatorio em PDF gerado a partir dos dados estruturados da sua conta.', left, 118, {
        width: contentWidth,
      })

    pdf.roundedRect(left, 154, contentWidth, 116, 10).fillAndStroke('#F7F6FF', '#E6E0FF')
    pdf.fillColor(ink).font('Helvetica-Bold').fontSize(12).text('Conta', left + 18, 174)
    pdf.fillColor(ink).font('Helvetica').fontSize(9)
    pdf.text(`Nome: ${payload.owner?.name ?? '-'}`, left + 18, 198)
    pdf.text(`E-mail: ${payload.owner?.email ?? '-'}`, left + 18, 214)
    pdf.text(`CRP: ${payload.owner?.crp ?? '-'}`, left + 18, 230)
    pdf.text(`Gerado em: ${exportedAt.toLocaleString('pt-BR')}`, left + 18, 246)

    sectionTitle('Resumo')
    row('Pacientes', payload.patients.length)
    row('Agendamentos', payload.appointments.length)
    row('Sessoes', payload.sessions.length)
    row('Registros financeiros', payload.financialRecords.length)
    row('Documentos', payload.documents.length)
    row('Solicitacoes pelo link publico', payload.publicBooking.requests.length)
    row('Datas bloqueadas', payload.availability.blockedDates.length)
    row('Horarios semanais', payload.availability.weeklySlots.length)

    sectionTitle('Pacientes')
    if (payload.patients.length === 0) {
      row('Status', 'Nenhum paciente exportado')
    } else {
      payload.patients.forEach((patient: any, index: number) => {
        if (pdf.y > pageHeight - 110) pdf.addPage()
        pdf.fillColor(ink).font('Helvetica-Bold').fontSize(10)
          .text(`${index + 1}. ${patient.name ?? 'Paciente sem nome'}`, left, pdf.y)
        pdf.moveDown(0.25)
        row('Status', patient.status)
        row('Contato', [patient.email, patient.phone].filter(Boolean).join(' | ') || '-')
        row('Inicio', patient.startDate ?? patient.createdAt)
      })
    }

    sectionTitle('Sessoes recentes')
    if (payload.sessions.length === 0) {
      row('Status', 'Nenhuma sessao exportada')
    } else {
      payload.sessions.slice(0, 20).forEach((session: any, index: number) => {
        if (pdf.y > pageHeight - 95) pdf.addPage()
        pdf.fillColor(ink).font('Helvetica-Bold').fontSize(10)
          .text(`${index + 1}. ${this.formatPdfValue(session.date)} - ${session.patientId ?? 'paciente'}`, left, pdf.y)
        pdf.moveDown(0.25)
        row('Duracao', session.duration ? `${session.duration} min` : '-')
        row('Resumo', session.summary)
      })
      if (payload.sessions.length > 20) {
        row('Observacao', `Outras ${payload.sessions.length - 20} sessoes aparecem no apendice estruturado.`)
      }
    }

    writeJsonBlock('Apendice estruturado completo', payload)

    const range = pdf.bufferedPageRange()
    for (let i = range.start; i < range.start + range.count; i += 1) {
      pdf.switchToPage(i)
      const footerY = pageHeight - 34
      pdf.strokeColor(line).lineWidth(1).moveTo(left, footerY - 8).lineTo(right, footerY - 8).stroke()
      pdf.fillColor(muted).font('Helvetica').fontSize(7)
        .text('Exportacao privada de dados UseCognia', left, footerY, { width: 240 })
      pdf.text(`Pagina ${i + 1} de ${range.count}`, right - 90, footerY, { width: 90, align: 'right' })
    }

    pdf.end()
    return done
  }

  private collectPdf(pdf: PDFKit.PDFDocument): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      pdf.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
      pdf.on('end', () => resolve(Buffer.concat(chunks)))
      pdf.on('error', reject)
    })
  }

  private formatPdfValue(value: unknown): string {
    if (value === null || value === undefined || value === '') return '-'
    if (value instanceof Date) return value.toLocaleString('pt-BR')
    return String(value)
  }

  private cleanUser(user: User) {
    const {
      passwordHash,
      resetPasswordToken,
      resetPasswordExpiry,
      emailVerificationToken,
      emailVerificationExpiry,
      preferences,
      ...safeUser
    } = user
    void passwordHash
    void resetPasswordToken
    void resetPasswordExpiry
    void emailVerificationToken
    void emailVerificationExpiry
    void preferences
    return {
      ...safeUser,
      preferences: this.cleanPreferences(user.preferences),
    }
  }

  private cleanSubscription(subscription: Subscription) {
    const { gatewayCustomerId, gatewaySubscriptionId, ...safeSubscription } = subscription
    void gatewayCustomerId
    void gatewaySubscriptionId
    return safeSubscription
  }

  private cleanPatient(patient: Patient) {
    return {
      ...patient,
      privateNotes: safeDecrypt(patient.privateNotes),
      prontuario: this.decryptProntuario(patient.prontuario),
    }
  }

  private cleanSession(session: Session) {
    return {
      ...session,
      summary: safeDecrypt(session.summary),
      privateNotes: safeDecrypt(session.privateNotes),
      nextSteps: safeDecrypt(session.nextSteps),
    }
  }

  private cleanDocument(document: Document) {
    const { signHash, signerIp, ...safeDocument } = document
    void signHash
    void signerIp
    return safeDocument
  }

  private cleanPreferences(preferences?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!preferences) return undefined

    const safe = { ...preferences }
    safe.asaasApiKeyConfigured = typeof preferences.asaasApiKey === 'string' && preferences.asaasApiKey.trim().length > 0
    delete safe.asaasApiKey
    delete safe.googleCalendarAccessToken
    delete safe.googleCalendarRefreshToken
    delete safe.googleCalendarExpiresAt
    return safe
  }

  private decryptProntuario(value?: Record<string, any>): Record<string, any> | undefined {
    const encrypted = value as EncryptedProntuario | undefined
    if (
      encrypted
      && encrypted.__encrypted === 'psicosaas.prontuario.v1'
      && typeof encrypted.data === 'string'
    ) {
      try {
        return JSON.parse(safeDecrypt(encrypted.data) ?? '{}')
      } catch {
        return {}
      }
    }

    return value
  }
}
