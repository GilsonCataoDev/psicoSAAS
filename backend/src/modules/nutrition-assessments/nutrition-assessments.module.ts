import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuditModule } from '../audit/audit.module'
import { Patient } from '../patients/entities/patient.entity'
import { NutritionAssessment } from './entities/nutrition-assessment.entity'
import { NutritionAssessmentsController } from './nutrition-assessments.controller'
import { NutritionAssessmentsService } from './nutrition-assessments.service'

@Module({
  imports: [TypeOrmModule.forFeature([NutritionAssessment, Patient]), AuditModule],
  controllers: [NutritionAssessmentsController],
  providers: [NutritionAssessmentsService],
})
export class NutritionAssessmentsModule {}
