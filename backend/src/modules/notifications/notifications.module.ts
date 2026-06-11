import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { NotificationsService } from './notifications.service'
import { EmailModule } from '../email/email.module'
import { Subscription } from '../billing/entities/subscription.entity'
import { User } from '../auth/entities/user.entity'
import { NotificationsController, PushNotificationsController } from './notifications.controller'
import { PushSubscriptionEntity } from './entities/push-subscription.entity'

@Module({
  imports: [EmailModule, TypeOrmModule.forFeature([Subscription, User, PushSubscriptionEntity])],
  controllers: [NotificationsController, PushNotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
