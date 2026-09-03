import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PatientsController } from './patients.controller'
import { PatientPortalController } from './patient-portal.controller'
import { PatientAttachmentsController } from './patient-attachments.controller'
import { PatientsImportController } from './patients-import.controller'
import { PatientsService } from './patients.service'
import { PatientAttachmentsService } from './patient-attachments.service'
import { PatientsImportService } from './patients-import.service'
import { Patient } from './entities/patient.entity'
import { PatientAttachment } from './entities/patient-attachment.entity'
import { Appointment } from '../appointments/entities/appointment.entity'
import { AuditModule } from '../audit/audit.module'
import { FinancialModule } from '../financial/financial.module'
import { NeuropsychAssessment } from '../neuropsych-assessments/entities/neuropsych-assessment.entity'
import { Document } from '../documents/entities/document.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Patient, PatientAttachment, Appointment, NeuropsychAssessment, Document]), AuditModule, FinancialModule],
  // PatientsImportController precisa vir antes de PatientsController: sua rota
  // "patients/import" seria capturada por "patients/:id" (com id="import") se
  // PatientsController fosse registrado primeiro.
  controllers: [PatientsImportController, PatientsController, PatientPortalController, PatientAttachmentsController],
  providers: [PatientsService, PatientAttachmentsService, PatientsImportService],
  exports: [PatientsService],
})
export class PatientsModule {}
