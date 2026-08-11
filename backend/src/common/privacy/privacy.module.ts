import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { EmailLog } from '../../modules/email/entities/email-log.entity'
import { LoginAttempt } from '../../modules/auth/entities/login-attempt.entity'
import { AuditLog } from '../../modules/audit/entities/audit-log.entity'
import { BookingContactMemory } from '../../modules/booking/entities/booking-contact-memory.entity'
import { PrivacyRetentionJob } from './privacy-retention.job'

@Module({
  imports: [TypeOrmModule.forFeature([EmailLog, LoginAttempt, AuditLog, BookingContactMemory])],
  providers: [PrivacyRetentionJob],
})
export class PrivacyModule {}
