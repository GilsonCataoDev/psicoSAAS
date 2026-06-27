import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PatientsController } from './patients.controller'
import { PatientPortalController } from './patient-portal.controller'
import { PatientsService } from './patients.service'
import { Patient } from './entities/patient.entity'
import { Subscription } from '../billing/entities/subscription.entity'
import { Appointment } from '../appointments/entities/appointment.entity'
import { AuditModule } from '../audit/audit.module'

@Module({
  imports: [TypeOrmModule.forFeature([Patient, Subscription, Appointment]), AuditModule],
  controllers: [PatientsController, PatientPortalController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}
