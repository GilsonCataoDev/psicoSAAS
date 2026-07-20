import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuditModule } from '../audit/audit.module'
import { Patient } from '../patients/entities/patient.entity'
import { InstrumentAssignment } from '../instrument-assignments/entities/instrument-assignment.entity'
import { NeuropsychAssessment } from './entities/neuropsych-assessment.entity'
import { NeuropsychBatteryItem } from './entities/neuropsych-battery-item.entity'
import { NeuropsychAssessmentsController } from './neuropsych-assessments.controller'
import { NeuropsychAssessmentsService } from './neuropsych-assessments.service'

@Module({
  imports: [TypeOrmModule.forFeature([NeuropsychAssessment, NeuropsychBatteryItem, Patient, InstrumentAssignment]), AuditModule],
  controllers: [NeuropsychAssessmentsController],
  providers: [NeuropsychAssessmentsService],
  exports: [NeuropsychAssessmentsService],
})
export class NeuropsychAssessmentsModule {}
