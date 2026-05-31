import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { FinancialController, AsaasWebhookController } from './financial.controller'
import { FinancialService } from './financial.service'
import { FinancialRecord } from './entities/financial-record.entity'
import { NotificationsModule } from '../notifications/notifications.module'
import { User } from '../auth/entities/user.entity'
import { Patient } from '../patients/entities/patient.entity'
import { Session } from '../sessions/entities/session.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([FinancialRecord, User, Patient, Session]),
    NotificationsModule,
  ],
  controllers: [FinancialController, AsaasWebhookController],
  providers: [FinancialService],
  exports: [FinancialService],
})
export class FinancialModule {}
