import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PatientsController } from './patients.controller'
import { PatientPortalController } from './patient-portal.controller'
import { PatientAttachmentsController } from './patient-attachments.controller'
import { PatientsService } from './patients.service'
import { PatientAttachmentsService } from './patient-attachments.service'
import { Patient } from './entities/patient.entity'
import { PatientAttachment } from './entities/patient-attachment.entity'
import { Subscription } from '../billing/entities/subscription.entity'
import { Appointment } from '../appointments/entities/appointment.entity'
import { AuditModule } from '../audit/audit.module'
import { FinancialModule } from '../financial/financial.module'

@Module({
  imports: [TypeOrmModule.forFeature([Patient, PatientAttachment, Subscription, Appointment]), AuditModule, FinancialModule],
  controllers: [PatientsController, PatientPortalController, PatientAttachmentsController],
  providers: [PatientsService, PatientAttachmentsService],
  exports: [PatientsService],
})
export class PatientsModule {}
