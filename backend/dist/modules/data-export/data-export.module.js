"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataExportModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const user_entity_1 = require("../auth/entities/user.entity");
const patient_entity_1 = require("../patients/entities/patient.entity");
const appointment_entity_1 = require("../appointments/entities/appointment.entity");
const session_entity_1 = require("../sessions/entities/session.entity");
const financial_record_entity_1 = require("../financial/entities/financial-record.entity");
const document_entity_1 = require("../documents/entities/document.entity");
const availability_slot_entity_1 = require("../availability/entities/availability-slot.entity");
const blocked_date_entity_1 = require("../availability/entities/blocked-date.entity");
const booking_page_entity_1 = require("../booking/entities/booking-page.entity");
const booking_entity_1 = require("../booking/entities/booking.entity");
const subscription_entity_1 = require("../billing/entities/subscription.entity");
const data_export_controller_1 = require("./data-export.controller");
const data_export_service_1 = require("./data-export.service");
let DataExportModule = class DataExportModule {
};
exports.DataExportModule = DataExportModule;
exports.DataExportModule = DataExportModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                user_entity_1.User,
                patient_entity_1.Patient,
                appointment_entity_1.Appointment,
                session_entity_1.Session,
                financial_record_entity_1.FinancialRecord,
                document_entity_1.Document,
                availability_slot_entity_1.AvailabilitySlot,
                blocked_date_entity_1.BlockedDate,
                booking_page_entity_1.BookingPage,
                booking_entity_1.Booking,
                subscription_entity_1.Subscription,
            ]),
        ],
        controllers: [data_export_controller_1.DataExportController],
        providers: [data_export_service_1.DataExportService],
    })
], DataExportModule);
//# sourceMappingURL=data-export.module.js.map