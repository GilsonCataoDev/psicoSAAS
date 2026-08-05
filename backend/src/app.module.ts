import { Module } from '@nestjs/common'
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
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
import { DocumentsModule } from './modules/documents/documents.module'
import { EmailModule } from './modules/email/email.module'
import { AnalyticsModule } from './modules/analytics/analytics.module'
import { ReferralModule } from './modules/referral/referral.module'
import { BillingModule } from './modules/billing/billing.module'
import { DataExportModule } from './modules/data-export/data-export.module'
import { GoogleCalendarModule } from './modules/google-calendar/google-calendar.module'
import { InstrumentAssignmentsModule } from './modules/instrument-assignments/instrument-assignments.module'
import { AuditModule } from './modules/audit/audit.module'
import { TemplatesModule } from './modules/templates/templates.module'
import { AdminModule } from './modules/admin/admin.module'
import { TestimonialModule } from './modules/testimonial/testimonial.module'
import { ChurnModule } from './modules/churn/churn.module'
import { ProspectingModule } from './modules/prospecting/prospecting.module'
import { PlanGuard } from './common/guards/plan.guard'
import { SubscriptionGuard } from './common/guards/subscription.guard'
import { LastActiveInterceptor } from './common/interceptors/last-active.interceptor'
import { AdvisoryLockModule } from './common/advisory-lock/advisory-lock.module'
import { StorageModule } from './common/storage/storage.module'
import { SecurityModule } from './common/security/security.module'
import { AuditInterceptor } from './modules/audit/interceptors/audit.interceptor'
import { MonitoringModule } from './common/monitoring/monitoring.module'
import { HealthController } from './health.controller'
import { NeuropsychAssessmentsModule } from './modules/neuropsych-assessments/neuropsych-assessments.module'
import { PrivacyModule } from './common/privacy/privacy.module'
import { PlanAccessModule } from './common/plan-access/plan-access.module'
import { BackupModule } from './common/backup/backup.module'

const readPositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000,  limit: 3   },
      { name: 'long',  ttl: 60000, limit: 100  },
    ]),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        url: cfg.getOrThrow<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: cfg.get<string>('TYPEORM_SYNC') === 'true' && cfg.get<string>('NODE_ENV') !== 'production',
        logging: ['error'],
        extra: {
          max: readPositiveInt(cfg.get<string>('DB_POOL_MAX'), 10),
          idleTimeoutMillis: readPositiveInt(cfg.get<string>('DB_IDLE_TIMEOUT_MS'), 30_000),
          connectionTimeoutMillis: readPositiveInt(cfg.get<string>('DB_CONNECTION_TIMEOUT_MS'), 5_000),
          application_name: cfg.get<string>('DB_APPLICATION_NAME') ?? 'usecognia-api',
        },
      }),
    }),

    AdvisoryLockModule,
    PlanAccessModule,
    StorageModule,
    SecurityModule,
    AuditModule,
    MonitoringModule,
    PrivacyModule,
    BackupModule,
    AuthModule,
    PatientsModule,
    AppointmentsModule,
    SessionsModule,
    FinancialModule,
    NotificationsModule,
    AvailabilityModule,
    BookingModule,
    DocumentsModule,
    EmailModule,
    AnalyticsModule,
    ReferralModule,
    BillingModule,
    DataExportModule,
    GoogleCalendarModule,
    InstrumentAssignmentsModule,
    NeuropsychAssessmentsModule,
    TemplatesModule,
    AdminModule,
    TestimonialModule,
    ChurnModule,
    ProspectingModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD,       useClass: ThrottlerGuard },
    { provide: APP_GUARD,       useClass: SubscriptionGuard },
    { provide: APP_GUARD,       useClass: PlanGuard },
    { provide: APP_INTERCEPTOR, useClass: LastActiveInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
