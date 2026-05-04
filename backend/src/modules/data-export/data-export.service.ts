import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
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

  private cleanUser(user: User) {
    const {
      passwordHash,
      resetPasswordToken,
      resetPasswordExpiry,
      ...safeUser
    } = user
    void passwordHash
    void resetPasswordToken
    void resetPasswordExpiry
    return safeUser
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
