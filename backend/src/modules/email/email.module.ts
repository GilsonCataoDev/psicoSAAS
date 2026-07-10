import { Module, Global } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { EmailService } from './email.service'
import { EmailWebhookService } from './email-webhook.service'
import { EmailWebhookController } from './email-webhook.controller'
import { EmailLog } from './entities/email-log.entity'
import { EmailSuppression } from './entities/email-suppression.entity'

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([EmailLog, EmailSuppression])],
  controllers: [EmailWebhookController],
  providers: [EmailService, EmailWebhookService],
  exports: [EmailService, TypeOrmModule],
})
export class EmailModule {}
