import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BookingController } from './booking.controller'
import { BookingService } from './booking.service'
import { PublicBookingController } from './public-booking.controller'
import { Booking } from './entities/booking.entity'
import { BookingPage } from './entities/booking-page.entity'
import { AvailabilityModule } from '../availability/availability.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { Patient } from '../patients/entities/patient.entity'
import { Appointment } from '../appointments/entities/appointment.entity'
import { FinancialRecord } from '../financial/entities/financial-record.entity'
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module'
import { User } from '../auth/entities/user.entity'
import { Session } from '../sessions/entities/session.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, BookingPage, Patient, Appointment, FinancialRecord, User, Session]),
    AvailabilityModule,
    NotificationsModule,
    GoogleCalendarModule,
  ],
  controllers: [BookingController, PublicBookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
