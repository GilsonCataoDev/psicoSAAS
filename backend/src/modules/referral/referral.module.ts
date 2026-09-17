import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Referral } from './entities/referral.entity'
import { ReferralPayoutProfile } from './entities/referral-payout-profile.entity'
import { User } from '../auth/entities/user.entity'
import { ReferralService } from './referral.service'
import { ReferralAdminController, ReferralController } from './referral.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Referral, ReferralPayoutProfile, User])],
  providers: [ReferralService],
  controllers: [ReferralController, ReferralAdminController],
  exports: [ReferralService],
})
export class ReferralModule {}
