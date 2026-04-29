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
import { ReferralModule }  from '../referral/referral.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken]),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get('JWT_SECRET'),
        // Default expiresIn definido por segurança — o controller sobrescreve
        // explicitamente em cada sign() call com '15m'
        signOptions: { expiresIn: '15m' },
      }),
    }),
    forwardRef(() => ReferralModule),
  ],
  controllers: [AuthController],
  providers:   [AuthService, JwtStrategy],
  exports:     [AuthService],
})
export class AuthModule {}
