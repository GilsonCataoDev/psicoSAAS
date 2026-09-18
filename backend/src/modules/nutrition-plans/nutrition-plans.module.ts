import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuditModule } from '../audit/audit.module'
import { Patient } from '../patients/entities/patient.entity'
import { NutritionPlan } from './entities/nutrition-plan.entity'
import { NutritionPlansController } from './nutrition-plans.controller'
import { NutritionPlansService } from './nutrition-plans.service'

@Module({
  imports: [TypeOrmModule.forFeature([NutritionPlan, Patient]), AuditModule],
  controllers: [NutritionPlansController],
  providers: [NutritionPlansService],
})
export class NutritionPlansModule {}
