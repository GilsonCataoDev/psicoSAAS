import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { AuthModule } from './modules/auth/auth.module'
import { PatientsModule } from './modules/patients/patients.module'
import { AppointmentsModule } from './modules/appointments/appointments.module'
import { SessionsModule } from './modules/sessions/sessions.module'
import { FinancialModule } from './modules/financial/financial.module'
import { NotificationsModule } from './modules/notifications/notifications.module'
import { BookingModule } from './modules/booking/booking.module'
import { AvailabilityModule } from './modules/availability/availability.module'
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module'
import { DocumentsModule } from './modules/documents/documents.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // ── Rate limiting global ─────────────────────────────────────────────────
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000,  limit: 3   }, // 3 req/s (anti-DDoS)
      { name: 'long',  ttl: 60000, limit: 100  }, // 100 req/min por IP
    ]),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        url: cfg.get('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: cfg.get('NODE_ENV') !== 'production',
        logging: false, // nunca logar queries em produção (dados sensíveis)
      }),
    }),

    AuthModule,
    PatientsModule,
    AppointmentsModule,
    SessionsModule,
    FinancialModule,
    NotificationsModule,
    AvailabilityModule,
    BookingModule,
    SubscriptionsModule,
    DocumentsModule,
  ],
  providers: [
    // ThrottlerGuard aplicado globalmente a todos os endpoints
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
