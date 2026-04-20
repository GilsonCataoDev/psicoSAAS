import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from './modules/auth/auth.module'
import { PatientsModule } from './modules/patients/patients.module'
import { AppointmentsModule } from './modules/appointments/appointments.module'
import { SessionsModule } from './modules/sessions/sessions.module'
import { FinancialModule } from './modules/financial/financial.module'
import { NotificationsModule } from './modules/notifications/notifications.module'
import { BookingModule } from './modules/booking/booking.module'
import { AvailabilityModule } from './modules/availability/availability.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        url: cfg.get('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: cfg.get('NODE_ENV') !== 'production',
        logging: cfg.get('NODE_ENV') === 'development',
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
  ],
})
export class AppModule {}
