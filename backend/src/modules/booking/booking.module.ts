import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BookingController } from './booking.controller'
import { BookingService } from './booking.service'
import { PublicBookingController } from './public-booking.controller'
import { Booking } from './entities/booking.entity'
import { BookingPage } from './entities/booking-page.entity'
import { AvailabilityModule } from '../availability/availability.module'
import { NotificationsModule } from '../notifications/notifications.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, BookingPage]),
    AvailabilityModule,
    NotificationsModule,
  ],
  controllers: [BookingController, PublicBookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
