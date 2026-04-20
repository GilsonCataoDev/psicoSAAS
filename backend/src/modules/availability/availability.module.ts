import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AvailabilityController } from './availability.controller'
import { AvailabilityService } from './availability.service'
import { AvailabilitySlot } from './entities/availability-slot.entity'
import { BlockedDate } from './entities/blocked-date.entity'

@Module({
  imports: [TypeOrmModule.forFeature([AvailabilitySlot, BlockedDate])],
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
