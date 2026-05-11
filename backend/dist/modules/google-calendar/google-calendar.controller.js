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
exports.GoogleCalendarController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const csrf_guard_1 = require("../auth/guards/csrf.guard");
const public_route_decorator_1 = require("../../common/decorators/public-route.decorator");
const google_calendar_service_1 = require("./google-calendar.service");
let GoogleCalendarController = class GoogleCalendarController {
    constructor(googleCalendar) {
        this.googleCalendar = googleCalendar;
    }
    status(req) {
        return this.googleCalendar.getStatus(req.user.id);
    }
    connect(req) {
        return { url: this.googleCalendar.getAuthUrl(req.user.id) };
    }
    async callback(code, state, res) {
        const { redirectUrl } = await this.googleCalendar.handleCallback(code, state);
        return res.redirect(redirectUrl);
    }
    disconnect(req) {
        return this.googleCalendar.disconnect(req.user.id);
    }
};
exports.GoogleCalendarController = GoogleCalendarController;
__decorate([
    (0, common_1.Get)('status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, throttler_1.SkipThrottle)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GoogleCalendarController.prototype, "status", null);
__decorate([
    (0, common_1.Get)('connect'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, throttler_1.SkipThrottle)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GoogleCalendarController.prototype, "connect", null);
__decorate([
    (0, common_1.Get)('callback'),
    (0, public_route_decorator_1.PublicRoute)(),
    (0, throttler_1.SkipThrottle)(),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('state')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], GoogleCalendarController.prototype, "callback", null);
__decorate([
    (0, common_1.Delete)('disconnect'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, csrf_guard_1.CsrfGuard),
    (0, throttler_1.SkipThrottle)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GoogleCalendarController.prototype, "disconnect", null);
exports.GoogleCalendarController = GoogleCalendarController = __decorate([
    (0, common_1.Controller)('google-calendar'),
    __metadata("design:paramtypes", [google_calendar_service_1.GoogleCalendarService])
], GoogleCalendarController);
//# sourceMappingURL=google-calendar.controller.js.map