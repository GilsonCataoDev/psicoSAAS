import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SalesRep } from './entities/sales-rep.entity'
import { SalesCommission } from './entities/sales-commission.entity'
import { SalesService } from './sales.service'
import { SalesController } from './sales.controller'
import { SalesCommissionReleaseJob } from './sales-commission-release.job'

@Module({
  imports: [TypeOrmModule.forFeature([SalesRep, SalesCommission])],
  controllers: [SalesController],
  providers: [SalesService, SalesCommissionReleaseJob],
  exports: [SalesService],
})
export class SalesModule {}
