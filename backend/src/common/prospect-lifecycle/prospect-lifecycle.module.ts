import { Global, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Prospect } from '../../modules/prospecting/entities/prospect.entity'
import { ProspectActivity } from '../../modules/prospecting/entities/prospect-activity.entity'
import { ProspectLifecycleService } from './prospect-lifecycle.service'

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Prospect, ProspectActivity])],
  providers: [ProspectLifecycleService],
  exports: [ProspectLifecycleService],
})
export class ProspectLifecycleModule {}
