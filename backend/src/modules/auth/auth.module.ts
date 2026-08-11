import { Module, forwardRef } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigService } from '@nestjs/config'
import { AuthController }  from './auth.controller'
import { AuthService }     from './auth.service'
import { JwtStrategy }     from './strategies/jwt.strategy'
import { User }            from './entities/user.entity'
import { RefreshToken }    from './entities/refresh-token.entity'
import { LoginAttempt }    from './entities/login-attempt.entity'
import { ReferralModule }  from '../referral/referral.module'
import { BillingModule }   from '../billing/billing.module'
import { AuditModule }     from '../audit/audit.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken, LoginAttempt]),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get('JWT_SECRET'),
        signOptions: {
          expiresIn: '15m',
          issuer: cfg.get<string>('JWT_ISSUER') ?? 'usecognia-api',
          audience: cfg.get<string>('JWT_AUDIENCE') ?? 'usecognia-app',
        },
      }),
    }),
    forwardRef(() => ReferralModule),
    BillingModule,
    AuditModule,
    // SecurityModule e StorageModule sao @Global() — nao precisam ser importados aqui
  ],
  controllers: [AuthController],
  providers:   [AuthService, JwtStrategy],
  exports:     [AuthService],
})
export class AuthModule {}
