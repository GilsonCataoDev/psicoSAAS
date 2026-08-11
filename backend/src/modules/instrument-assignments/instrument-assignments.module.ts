import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InstrumentAssignment } from './entities/instrument-assignment.entity'
import { InstrumentSchedule } from './entities/instrument-schedule.entity'
import { InstrumentAssignmentsController } from './instrument-assignments.controller'
import { InstrumentAssignmentsService } from './instrument-assignments.service'
import { InstrumentRecurrenceJob } from './instrument-recurrence.job'
import { Patient } from '../patients/entities/patient.entity'
import { NotificationsModule } from '../notifications/notifications.module'
import { SessionsModule } from '../sessions/sessions.module'

@Module({
  imports: [TypeOrmModule.forFeature([InstrumentAssignment, InstrumentSchedule, Patient]), NotificationsModule, SessionsModule],
  controllers: [InstrumentAssignmentsController],
  providers: [InstrumentAssignmentsService, InstrumentRecurrenceJob],
})
export class InstrumentAssignmentsModule {}
