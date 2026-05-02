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
exports.BookingController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const booking_service_1 = require("./booking.service");
const save_booking_page_dto_1 = require("./dto/save-booking-page.dto");
let BookingController = class BookingController {
    constructor(svc) {
        this.svc = svc;
    }
    getMyBookings(req, status) {
        return this.svc.getMyBookings(req.user.id, status);
    }
    async getDailyLink(req) {
        await this.svc.getMyPage(req.user.id);
        const baseUrl = process.env.FRONTEND_URL ?? 'https://gilsoncataodev.github.io/psicoSAAS';
        return this.svc.getDailyLink(req.user.id, baseUrl);
    }
    confirm(id, req) {
        return this.svc.confirmBooking(id, req.user.id);
    }
    reject(id, req, reason) {
        return this.svc.rejectBooking(id, req.user.id, reason);
    }
    markPaid(id, req, method) {
        return this.svc.markPaid(id, req.user.id, method);
    }
    syncAppointments(req) {
        return this.svc.syncConfirmedBookings(req.user.id);
    }
    getPage(req) {
        return this.svc.getMyPage(req.user.id);
    }
    savePage(req, dto) {
        return this.svc.saveMyPage(req.user.id, dto);
    }
};
exports.BookingController = BookingController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BookingController.prototype, "getMyBookings", null);
__decorate([
    (0, common_1.Get)('daily-link'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BookingController.prototype, "getDailyLink", null);
__decorate([
    (0, common_1.Patch)(':id/confirm'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BookingController.prototype, "confirm", null);
__decorate([
    (0, common_1.Patch)(':id/reject'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)('reason')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], BookingController.prototype, "reject", null);
__decorate([
    (0, common_1.Patch)(':id/pay'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)('method')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], BookingController.prototype, "markPaid", null);
__decorate([
    (0, common_1.Post)('sync-appointments'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BookingController.prototype, "syncAppointments", null);
__decorate([
    (0, common_1.Get)('page'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BookingController.prototype, "getPage", null);
__decorate([
    (0, common_1.Post)('page'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, save_booking_page_dto_1.SaveBookingPageDto]),
    __metadata("design:returntype", void 0)
], BookingController.prototype, "savePage", null);
exports.BookingController = BookingController = __decorate([
    (0, common_1.Controller)('booking'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [booking_service_1.BookingService])
], BookingController);
//# sourceMappingURL=booking.controller.js.map