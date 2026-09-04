import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { NpsResponse } from './entities/nps-response.entity'
import { NpsService } from './nps.service'
import { NpsController } from './nps.controller'
import { NotificationsModule } from '../notifications/notifications.module'

@Module({
  imports: [TypeOrmModule.forFeature([NpsResponse]), NotificationsModule],
  controllers: [NpsController],
  providers: [NpsService],
})
export class NpsModule {}
