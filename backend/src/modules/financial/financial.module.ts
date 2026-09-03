import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { FinancialController, AsaasWebhookController } from './financial.controller'
import { FinancialService } from './financial.service'
import { FinancialRecord } from './entities/financial-record.entity'
import { RecurringExpense } from './entities/recurring-expense.entity'
import { NotificationsModule } from '../notifications/notifications.module'
import { User } from '../auth/entities/user.entity'
import { Patient } from '../patients/entities/patient.entity'
import { Session } from '../sessions/entities/session.entity'
import { Booking } from '../booking/entities/booking.entity'
import { Appointment } from '../appointments/entities/appointment.entity'
import { PaymentReminderJob } from './payment-reminder.job'
import { RecurringExpenseJob } from './recurring-expense.job'

@Module({
  imports: [
    TypeOrmModule.forFeature([FinancialRecord, RecurringExpense, User, Patient, Session, Booking, Appointment]),
    NotificationsModule,
  ],
  controllers: [FinancialController, AsaasWebhookController],
  providers: [FinancialService, PaymentReminderJob, RecurringExpenseJob],
  exports: [FinancialService],
})
export class FinancialModule {}
