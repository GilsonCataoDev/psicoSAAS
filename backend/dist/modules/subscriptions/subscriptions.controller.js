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
exports.SubscriptionsController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const subscriptions_service_1 = require("./subscriptions.service");
const asaas_service_1 = require("./asaas.service");
const create_subscription_dto_1 = require("./dto/create-subscription.dto");
let SubscriptionsController = class SubscriptionsController {
    constructor(subs, asaas) {
        this.subs = subs;
        this.asaas = asaas;
    }
    async getMe(req) {
        return this.subs.getOrCreateTrial(req.user.id);
    }
    async subscribe(req, dto) {
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
            ?? req.socket?.remoteAddress
            ?? '0.0.0.0';
        return this.subs.subscribe(req.user, dto, ip);
    }
    async cancel(req) {
        return this.subs.cancel(req.user.id);
    }
    async handleWebhook(body) {
        if (!this.asaas.validateWebhookToken(body.accessToken)) {
            return { received: false };
        }
        await this.subs.handleWebhook(body);
        return { received: true };
    }
};
exports.SubscriptionsController = SubscriptionsController;
__decorate([
    (0, common_1.Get)('me'),
    (0, throttler_1.SkipThrottle)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getMe", null);
__decorate([
    (0, common_1.Post)(),
    (0, throttler_1.Throttle)({ short: { limit: 3, ttl: 60000 } }),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_subscription_dto_1.CreateSubscriptionDto]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "subscribe", null);
__decorate([
    (0, common_1.Delete)('me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "cancel", null);
__decorate([
    (0, common_1.Post)('webhook/asaas'),
    (0, throttler_1.SkipThrottle)(),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "handleWebhook", null);
exports.SubscriptionsController = SubscriptionsController = __decorate([
    (0, common_1.Controller)('subscriptions'),
    __metadata("design:paramtypes", [subscriptions_service_1.SubscriptionsService,
        asaas_service_1.AsaasService])
], SubscriptionsController);
//# sourceMappingURL=subscriptions.controller.js.map