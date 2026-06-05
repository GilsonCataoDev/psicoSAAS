import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PatientsController } from './patients.controller'
import { PatientsService } from './patients.service'
import { Patient } from './entities/patient.entity'
import { Subscription } from '../billing/entities/subscription.entity'
import { AuditModule } from '../audit/audit.module'

@Module({
  imports: [TypeOrmModule.forFeature([Patient, Subscription]), AuditModule],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}
