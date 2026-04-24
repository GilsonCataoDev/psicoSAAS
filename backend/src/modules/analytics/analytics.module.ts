import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Patient } from '../patients/entities/patient.entity'
import { Appointment } from '../appointments/entities/appointment.entity'
import { FinancialRecord } from '../financial/entities/financial-record.entity'
import { AnalyticsService } from './analytics.service'
import { AnalyticsController } from './analytics.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Patient, Appointment, FinancialRecord])],
  providers: [AnalyticsService],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}
