import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { NotificationsService } from './notifications.service'
import { EmailModule } from '../email/email.module'
import { Subscription } from '../billing/entities/subscription.entity'

@Module({
  imports: [EmailModule, TypeOrmModule.forFeature([Subscription])],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
