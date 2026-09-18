import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PatientTask } from './entities/patient-task.entity'
import { Patient } from '../patients/entities/patient.entity'
import { PatientTasksService } from './patient-tasks.service'
import { PatientTasksController } from './patient-tasks.controller'

@Module({
  imports: [TypeOrmModule.forFeature([PatientTask, Patient])],
  controllers: [PatientTasksController],
  providers: [PatientTasksService],
  exports: [PatientTasksService],
})
export class PatientTasksModule {}
