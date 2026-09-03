import { Global, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from '../../modules/auth/entities/user.entity'
import { Subscription } from '../../modules/billing/entities/subscription.entity'
import { PlanAccessService } from './plan-access.service'

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Subscription, User])],
  providers: [PlanAccessService],
  exports: [PlanAccessService],
})
export class PlanAccessModule {}
