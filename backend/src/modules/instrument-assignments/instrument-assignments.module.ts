import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InstrumentAssignment } from './entities/instrument-assignment.entity'
import { InstrumentAssignmentsController } from './instrument-assignments.controller'
import { InstrumentAssignmentsService } from './instrument-assignments.service'
import { Patient } from '../patients/entities/patient.entity'
import { NotificationsModule } from '../notifications/notifications.module'

@Module({
  imports: [TypeOrmModule.forFeature([InstrumentAssignment, Patient]), NotificationsModule],
  controllers: [InstrumentAssignmentsController],
  providers: [InstrumentAssignmentsService],
})
export class InstrumentAssignmentsModule {}
