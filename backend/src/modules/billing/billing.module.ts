import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AsaasService } from './asaas.service'
import { BillingWebhookService } from './billing-webhook.service'
import { BillingTrialEmailJob } from './billing-trial-email.job'
import { BillingController } from './billing.controller'
import { BillingService } from './billing.service'
import { Subscription } from './entities/subscription.entity'
import { WebhookEvent } from './entities/webhook-event.entity'
import { User } from '../auth/entities/user.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Subscription, WebhookEvent, User])],
  controllers: [BillingController],
  providers: [AsaasService, BillingService, BillingWebhookService, BillingTrialEmailJob],
  exports: [BillingService],
})
export class BillingModule {}
