import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AppointmentsController } from './appointments.controller'
import { AppointmentsService } from './appointments.service'
import { Appointment } from './entities/appointment.entity'
import { Booking } from '../booking/entities/booking.entity'
import { NotificationsModule } from '../notifications/notifications.module'
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module'

@Module({
  imports: [TypeOrmModule.forFeature([Appointment, Booking]), NotificationsModule, GoogleCalendarModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}
