import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from '../auth/entities/user.entity'
import { GoogleCalendarController } from './google-calendar.controller'
import { GoogleCalendarService } from './google-calendar.service'

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [GoogleCalendarController],
  providers: [GoogleCalendarService],
  exports: [GoogleCalendarService],
})
export class GoogleCalendarModule {}
