import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from '../auth/entities/user.entity'
import { Subscription } from '../billing/entities/subscription.entity'
import { WebhookEvent } from '../billing/entities/webhook-event.entity'
import { EmailLog } from '../email/entities/email-log.entity'
import { BillingModule } from '../billing/billing.module'
import { AdminService } from './admin.service'
import { AdminController } from './admin.controller'
import { InternalCleanupController } from './internal-cleanup.controller'
import { AdminCampaignService } from './admin-campaign.service'

@Module({
  imports: [TypeOrmModule.forFeature([User, Subscription, WebhookEvent, EmailLog]), BillingModule],
  controllers: [AdminController, InternalCleanupController],
  providers: [AdminService, AdminCampaignService],
})
export class AdminModule {}
