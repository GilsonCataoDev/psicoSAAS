import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { TenantHealth } from './entities/tenant-health.entity'
import { TenantActivation } from './entities/tenant-activation.entity'
import { TenantAlert } from './entities/tenant-alert.entity'
import { ChurnService } from './churn.service'
import { ChurnScoreJob } from './churn-score.job'
import { ChurnController } from './churn.controller'
import { EmailModule } from '../email/email.module'
import { SessionsModule } from '../sessions/sessions.module'

@Module({
  imports: [TypeOrmModule.forFeature([TenantHealth, TenantActivation, TenantAlert]), EmailModule, SessionsModule],
  controllers: [ChurnController],
  providers: [ChurnService, ChurnScoreJob],
  exports: [ChurnService],
})
export class ChurnModule {}
