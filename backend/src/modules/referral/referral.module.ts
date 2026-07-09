import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Referral } from './entities/referral.entity'
import { Subscription } from '../billing/entities/subscription.entity'
import { Patient } from '../patients/entities/patient.entity'
import { Session } from '../sessions/entities/session.entity'
import { User } from '../auth/entities/user.entity'
import { BillingModule } from '../billing/billing.module'
import { ReferralService } from './referral.service'
import { ReferralController } from './referral.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Referral, Subscription, Patient, Session, User]), BillingModule],
  providers: [ReferralService],
  controllers: [ReferralController],
  exports: [ReferralService],
})
export class ReferralModule {}
