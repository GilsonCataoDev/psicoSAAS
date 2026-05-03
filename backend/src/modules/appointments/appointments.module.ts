import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AppointmentsController } from './appointments.controller'
import { AppointmentsService } from './appointments.service'
import { Appointment } from './entities/appointment.entity'
import { Booking } from '../booking/entities/booking.entity'
import { NotificationsModule } from '../notifications/notifications.module'

@Module({
  imports: [TypeOrmModule.forFeature([Appointment, Booking]), NotificationsModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}
