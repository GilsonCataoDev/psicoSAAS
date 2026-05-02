import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { FinancialController, AsaasWebhookController } from './financial.controller'
import { FinancialService } from './financial.service'
import { PatientAsaasService } from './asaas.service'
import { FinancialRecord } from './entities/financial-record.entity'
import { NotificationsModule } from '../notifications/notifications.module'
import { User } from '../auth/entities/user.entity'
import { Patient } from '../patients/entities/patient.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([FinancialRecord, User, Patient]),
    NotificationsModule,
  ],
  controllers: [FinancialController, AsaasWebhookController],
  providers: [FinancialService, PatientAsaasService],
  exports: [FinancialService],
})
export class FinancialModule {}
