import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AvailabilityController } from './availability.controller'
import { AvailabilityService } from './availability.service'
import { AvailabilitySlot } from './entities/availability-slot.entity'
import { BlockedDate } from './entities/blocked-date.entity'
import { ExtraAvailabilitySlot } from './entities/extra-availability-slot.entity'
import { Appointment } from '../appointments/entities/appointment.entity'
import { Booking } from '../booking/entities/booking.entity'

@Module({
  imports: [TypeOrmModule.forFeature([AvailabilitySlot, BlockedDate, ExtraAvailabilitySlot, Appointment, Booking])],
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
