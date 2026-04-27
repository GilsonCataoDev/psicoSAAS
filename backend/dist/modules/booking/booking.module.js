"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const booking_controller_1 = require("./booking.controller");
const booking_service_1 = require("./booking.service");
const public_booking_controller_1 = require("./public-booking.controller");
const booking_entity_1 = require("./entities/booking.entity");
const booking_page_entity_1 = require("./entities/booking-page.entity");
const availability_module_1 = require("../availability/availability.module");
const notifications_module_1 = require("../notifications/notifications.module");
let BookingModule = class BookingModule {
};
exports.BookingModule = BookingModule;
exports.BookingModule = BookingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([booking_entity_1.Booking, booking_page_entity_1.BookingPage]),
            availability_module_1.AvailabilityModule,
            notifications_module_1.NotificationsModule,
        ],
        controllers: [booking_controller_1.BookingController, public_booking_controller_1.PublicBookingController],
        providers: [booking_service_1.BookingService],
        exports: [booking_service_1.BookingService],
    })
], BookingModule);
//# sourceMappingURL=booking.module.js.map