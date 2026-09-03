import { Global, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuditLog } from '../../modules/audit/entities/audit-log.entity'
import { LoginAttempt } from '../../modules/auth/entities/login-attempt.entity'
import { RiskEngineService } from './risk-engine.service'
import { SuspiciousActivityService } from './suspicious-activity.service'

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, LoginAttempt])],
  providers: [RiskEngineService, SuspiciousActivityService],
  exports:   [RiskEngineService, SuspiciousActivityService],
})
export class SecurityModule {}
