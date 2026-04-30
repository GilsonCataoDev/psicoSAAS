"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicBookingController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const booking_service_1 = require("./booking.service");
const create_booking_dto_1 = require("./dto/create-booking.dto");
let PublicBookingController = class PublicBookingController {
    constructor(svc) {
        this.svc = svc;
    }
    getPage(slug) {
        return this.svc.getPublicPage(slug);
    }
    getSlots(slug, date) {
        return this.svc.getAvailableSlots(slug, date);
    }
    createBooking(slug, dto) {
        return this.svc.createBooking(slug, dto);
    }
    confirm(token) {
        return this.svc.confirmByToken(token);
    }
    cancel(token, reason) {
        return this.svc.cancelByToken(token, reason);
    }
};
exports.PublicBookingController = PublicBookingController;
__decorate([
    (0, common_1.Get)(':slug'),
    (0, throttler_1.Throttle)({ short: { limit: 30, ttl: 60000 } }),
    __param(0, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PublicBookingController.prototype, "getPage", null);
__decorate([
    (0, common_1.Get)(':slug/slots'),
    (0, throttler_1.Throttle)({ short: { limit: 30, ttl: 60000 } }),
    __param(0, (0, common_1.Param)('slug')),
    __param(1, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PublicBookingController.prototype, "getSlots", null);
__decorate([
    (0, common_1.Post)(':slug'),
    (0, throttler_1.Throttle)({ short: { limit: 5, ttl: 60000 } }),
    __param(0, (0, common_1.Param)('slug')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_booking_dto_1.CreateBookingDto]),
    __metadata("design:returntype", void 0)
], PublicBookingController.prototype, "createBooking", null);
__decorate([
    (0, common_1.Get)('confirm/:token'),
    (0, throttler_1.Throttle)({ short: { limit: 10, ttl: 60000 } }),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PublicBookingController.prototype, "confirm", null);
__decorate([
    (0, common_1.Get)('cancel/:token'),
    (0, throttler_1.Throttle)({ short: { limit: 10, ttl: 60000 } }),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Query)('reason')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PublicBookingController.prototype, "cancel", null);
exports.PublicBookingController = PublicBookingController = __decorate([
    (0, common_1.Controller)('public/booking'),
    __metadata("design:paramtypes", [booking_service_1.BookingService])
], PublicBookingController);
//# sourceMappingURL=public-booking.controller.js.map