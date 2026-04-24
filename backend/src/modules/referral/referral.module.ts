import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Referral } from './entities/referral.entity'
import { Subscription } from '../subscriptions/entities/subscription.entity'
import { ReferralService } from './referral.service'
import { ReferralController } from './referral.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Referral, Subscription])],
  providers: [ReferralService],
  controllers: [ReferralController],
  exports: [ReferralService],
})
export class ReferralModule {}
