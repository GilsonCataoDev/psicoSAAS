import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AppointmentsController } from './appointments.controller'
import { AppointmentsService } from './appointments.service'
import { AppointmentReminderJob } from './appointment-reminder.job'
import { Appointment } from './entities/appointment.entity'
import { Booking } from '../booking/entities/booking.entity'
import { NotificationsModule } from '../notifications/notifications.module'
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module'
import { Patient } from '../patients/entities/patient.entity'
import { Session } from '../sessions/entities/session.entity'
import { User } from '../auth/entities/user.entity'
import { FinancialRecord } from '../financial/entities/financial-record.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Appointment, Booking, Patient, Session, User, FinancialRecord]), NotificationsModule, GoogleCalendarModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentReminderJob],
})
export class AppointmentsModule {}
