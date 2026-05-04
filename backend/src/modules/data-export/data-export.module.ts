import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
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
import { DataExportController } from './data-export.controller'
import { DataExportService } from './data-export.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Patient,
      Appointment,
      Session,
      FinancialRecord,
      Document,
      AvailabilitySlot,
      BlockedDate,
      BookingPage,
      Booking,
      Subscription,
    ]),
  ],
  controllers: [DataExportController],
  providers: [DataExportService],
})
export class DataExportModule {}
