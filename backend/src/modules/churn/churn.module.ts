import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { TenantHealth } from './entities/tenant-health.entity'
import { TenantActivation } from './entities/tenant-activation.entity'
import { TenantAlert } from './entities/tenant-alert.entity'
import { ChurnService } from './churn.service'
import { ChurnScoreJob } from './churn-score.job'
import { ChurnController } from './churn.controller'

@Module({
  imports: [TypeOrmModule.forFeature([TenantHealth, TenantActivation, TenantAlert])],
  controllers: [ChurnController],
  providers: [ChurnService, ChurnScoreJob],
  exports: [ChurnService],
})
export class ChurnModule {}
