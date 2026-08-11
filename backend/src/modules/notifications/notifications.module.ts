import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { NotificationsService } from './notifications.service'
import { EmailModule } from '../email/email.module'
import { User } from '../auth/entities/user.entity'
import { NotificationsController, PushNotificationsController } from './notifications.controller'
import { PushSubscriptionEntity } from './entities/push-subscription.entity'
import { NativePushTokenEntity } from './entities/native-push-token.entity'
import { WhatsAppDeliveryLog } from './entities/whatsapp-delivery-log.entity'
import { WhatsAppLogRetentionJob } from './whatsapp-log-retention.job'
import { WhatsAppOutbox } from './entities/whatsapp-outbox.entity'
import { CloudWhatsAppProvider } from './providers/cloud-whatsapp.provider'
import { WhatsAppCloudWebhookController } from './whatsapp-cloud-webhook.controller'
import { WhatsAppOutboxRetryJob } from './whatsapp-outbox-retry.job'
import { WhatsAppOutboxReconciliationJob } from './whatsapp-outbox-reconciliation.job'

@Module({
  imports: [EmailModule, TypeOrmModule.forFeature([User, PushSubscriptionEntity, NativePushTokenEntity, WhatsAppDeliveryLog, WhatsAppOutbox])],
  controllers: [NotificationsController, PushNotificationsController, WhatsAppCloudWebhookController],
  providers: [NotificationsService, WhatsAppLogRetentionJob, WhatsAppOutboxRetryJob, WhatsAppOutboxReconciliationJob, CloudWhatsAppProvider],
  exports: [NotificationsService],
})
export class NotificationsModule {}
