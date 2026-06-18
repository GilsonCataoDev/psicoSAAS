import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SessionsController } from './sessions.controller'
import { SessionsService } from './sessions.service'
import { AiService } from './ai.service'
import { Session } from './entities/session.entity'
import { AiUsage } from './entities/ai-usage.entity'
import { FinancialModule } from '../financial/financial.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { Patient } from '../patients/entities/patient.entity'
import { User } from '../auth/entities/user.entity'
import { Appointment } from '../appointments/entities/appointment.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([Session, Patient, User, Appointment, AiUsage]),
    FinancialModule,
    NotificationsModule,
  ],
  controllers: [SessionsController],
  providers: [SessionsService, AiService],
})
export class SessionsModule {}
