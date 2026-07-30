import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuditModule } from '../audit/audit.module'
import { Patient } from '../patients/entities/patient.entity'
import { InstrumentAssignment } from '../instrument-assignments/entities/instrument-assignment.entity'
import { SessionsModule } from '../sessions/sessions.module'
import { AiUsage } from '../sessions/entities/ai-usage.entity'
import { NeuropsychAssessment } from './entities/neuropsych-assessment.entity'
import { NeuropsychBatteryItem } from './entities/neuropsych-battery-item.entity'
import { NeuropsychAiAnalysis } from './entities/neuropsych-ai-analysis.entity'
import { NeuropsychAssessmentsController } from './neuropsych-assessments.controller'
import { NeuropsychAssessmentsService } from './neuropsych-assessments.service'
import { NeuropsychAiAnalysisService } from './neuropsych-ai-analysis.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NeuropsychAssessment, NeuropsychBatteryItem, NeuropsychAiAnalysis,
      Patient, InstrumentAssignment, AiUsage,
    ]),
    AuditModule,
    SessionsModule,
  ],
  controllers: [NeuropsychAssessmentsController],
  providers: [NeuropsychAssessmentsService, NeuropsychAiAnalysisService],
  exports: [NeuropsychAssessmentsService],
})
export class NeuropsychAssessmentsModule {}
