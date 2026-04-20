import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { FinancialController } from './financial.controller'
import { FinancialService } from './financial.service'
import { FinancialRecord } from './entities/financial-record.entity'

@Module({
  imports: [TypeOrmModule.forFeature([FinancialRecord])],
  controllers: [FinancialController],
  providers: [FinancialService],
})
export class FinancialModule {}
