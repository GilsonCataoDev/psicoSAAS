import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { NotificationsService } from './notifications.service'
import { EmailModule } from '../email/email.module'
import { User } from '../auth/entities/user.entity'
import { NotificationsController, PushNotificationsController } from './notifications.controller'
import { PushSubscriptionEntity } from './entities/push-subscription.entity'
import { WhatsAppDeliveryLog } from './entities/whatsapp-delivery-log.entity'
import { WhatsAppLogRetentionJob } from './whatsapp-log-retention.job'

@Module({
  imports: [EmailModule, TypeOrmModule.forFeature([User, PushSubscriptionEntity, WhatsAppDeliveryLog])],
  controllers: [NotificationsController, PushNotificationsController],
  providers: [NotificationsService, WhatsAppLogRetentionJob],
  exports: [NotificationsService],
})
export class NotificationsModule {}
