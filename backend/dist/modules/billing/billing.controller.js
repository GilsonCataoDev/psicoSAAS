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
var BillingController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const asaas_service_1 = require("./asaas.service");
const billing_webhook_service_1 = require("./billing-webhook.service");
const billing_service_1 = require("./billing.service");
let BillingController = BillingController_1 = class BillingController {
    constructor(billing, asaas, webhooks) {
        this.billing = billing;
        this.asaas = asaas;
        this.webhooks = webhooks;
        this.logger = new common_1.Logger(BillingController_1.name);
    }
    async tokenize(req, body) {
        const remoteIp = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim()
            || req.ip
            || req.socket?.remoteAddress
            || '0.0.0.0';
        const creditCardToken = await this.asaas.tokenizeCreditCard(req.user, {
            holderName: body.holderName,
            number: body.number,
            expiryMonth: body.expiryMonth,
            expiryYear: body.expiryYear,
            ccv: body.ccv,
            cpfCnpj: body.cpfCnpj?.replace(/\D/g, ''),
            postalCode: body.postalCode?.replace(/\D/g, ''),
            addressNumber: body.addressNumber,
            phone: body.phone?.replace(/\D/g, ''),
            email: req.user.email,
            remoteIp,
        });
        return { creditCardToken };
    }
    subscribe(req, plan, creditCardToken) {
        return this.billing.subscribe(req.user, plan, creditCardToken);
    }
    activateFree(req) {
        return this.billing.activateFree(req.user.id);
    }
    updateCard(req, creditCardToken) {
        return this.billing.updateCard(req.user.id, creditCardToken);
    }
    cancel(req) {
        return this.billing.cancel(req.user.id);
    }
    metrics() {
        return this.billing.getMetrics();
    }
    me(req) {
        return this.billing.getMine(req.user.id);
    }
    webhook(headers, body) {
        if (!this.webhooks.isValidOrigin(headers, body)) {
            this.logger.warn('[Asaas webhook] Origem inválida');
            return { received: false };
        }
        this.webhooks.process(body).catch((err) => {
            this.logger.error('[Asaas webhook] Erro assíncrono', err);
        });
        return { received: true };
    }
};
exports.BillingController = BillingController;
__decorate([
    (0, common_1.Post)('tokenize'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "tokenize", null);
__decorate([
    (0, common_1.Post)('subscribe'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)('plan')),
    __param(2, (0, common_1.Body)('creditCardToken')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "subscribe", null);
__decorate([
    (0, common_1.Post)('free'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "activateFree", null);
__decorate([
    (0, common_1.Post)('update-card'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)('creditCardToken')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "updateCard", null);
__decorate([
    (0, common_1.Post)('cancel'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "cancel", null);
__decorate([
    (0, common_1.Get)('metrics'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "metrics", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "me", null);
__decorate([
    (0, common_1.Post)('webhook'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Headers)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "webhook", null);
exports.BillingController = BillingController = BillingController_1 = __decorate([
    (0, common_1.Controller)('billing'),
    __metadata("design:paramtypes", [billing_service_1.BillingService,
        asaas_service_1.AsaasService,
        billing_webhook_service_1.BillingWebhookService])
], BillingController);
//# sourceMappingURL=billing.controller.js.map