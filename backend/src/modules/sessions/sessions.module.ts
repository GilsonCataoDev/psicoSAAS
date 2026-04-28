import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SessionsController } from './sessions.controller'
import { SessionsService } from './sessions.service'
import { Session } from './entities/session.entity'
import { FinancialModule } from '../financial/financial.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { Patient } from '../patients/entities/patient.entity'
import { User } from '../auth/entities/user.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([Session, Patient, User]),
    FinancialModule,
    NotificationsModule,
  ],
  controllers: [SessionsController],
  providers: [SessionsService],
})
export class SessionsModule {}
