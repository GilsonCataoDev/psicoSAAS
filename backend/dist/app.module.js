"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const throttler_1 = require("@nestjs/throttler");
const auth_module_1 = require("./modules/auth/auth.module");
const patients_module_1 = require("./modules/patients/patients.module");
const appointments_module_1 = require("./modules/appointments/appointments.module");
const sessions_module_1 = require("./modules/sessions/sessions.module");
const financial_module_1 = require("./modules/financial/financial.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const booking_module_1 = require("./modules/booking/booking.module");
const availability_module_1 = require("./modules/availability/availability.module");
const subscriptions_module_1 = require("./modules/subscriptions/subscriptions.module");
const documents_module_1 = require("./modules/documents/documents.module");
const email_module_1 = require("./modules/email/email.module");
const analytics_module_1 = require("./modules/analytics/analytics.module");
const referral_module_1 = require("./modules/referral/referral.module");
const subscription_entity_1 = require("./modules/subscriptions/entities/subscription.entity");
const plan_guard_1 = require("./common/guards/plan.guard");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            throttler_1.ThrottlerModule.forRoot([
                { name: 'short', ttl: 1000, limit: 3 },
                { name: 'long', ttl: 60000, limit: 100 },
            ]),
            typeorm_1.TypeOrmModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (cfg) => ({
                    type: 'postgres',
                    url: cfg.get('DATABASE_URL'),
                    autoLoadEntities: true,
                    synchronize: cfg.get('NODE_ENV') !== 'production',
                    logging: false,
                }),
            }),
            typeorm_1.TypeOrmModule.forFeature([subscription_entity_1.Subscription]),
            auth_module_1.AuthModule,
            patients_module_1.PatientsModule,
            appointments_module_1.AppointmentsModule,
            sessions_module_1.SessionsModule,
            financial_module_1.FinancialModule,
            notifications_module_1.NotificationsModule,
            availability_module_1.AvailabilityModule,
            booking_module_1.BookingModule,
            subscriptions_module_1.SubscriptionsModule,
            documents_module_1.DocumentsModule,
            email_module_1.EmailModule,
            analytics_module_1.AnalyticsModule,
            referral_module_1.ReferralModule,
        ],
        providers: [
            { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard },
            { provide: core_1.APP_GUARD, useClass: plan_guard_1.PlanGuard },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map