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
exports.AsaasWebhookController = exports.FinancialController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const financial_service_1 = require("./financial.service");
const create_financial_dto_1 = require("./dto/create-financial.dto");
const charge_card_dto_1 = require("./dto/charge-card.dto");
let FinancialController = class FinancialController {
    constructor(svc) {
        this.svc = svc;
    }
    findAll(req, status, patientId) {
        return this.svc.findAll(req.user.id, status, patientId);
    }
    summary(req) { return this.svc.getSummary(req.user.id); }
    create(dto, req) {
        return this.svc.create(dto, req.user.id);
    }
    markPaid(id, method, req) {
        return this.svc.markPaid(id, method, req.user.id);
    }
    sendCharge(id, req) {
        return this.svc.sendChargeMessage(id, req.user.id);
    }
    generatePaymentLink(id, req) {
        return this.svc.generatePaymentLink(id, req.user.id);
    }
    chargeWithCard(id, dto, req, ip) {
        const remoteIp = req.headers['x-forwarded-for']
            ?.split(',')[0]?.trim()
            ?? ip
            ?? '177.0.0.1';
        return this.svc.chargeWithCard(id, req.user.id, dto, remoteIp);
    }
    remove(id, req) {
        return this.svc.remove(id, req.user.id);
    }
};
exports.FinancialController = FinancialController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('patientId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], FinancialController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('summary'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FinancialController.prototype, "summary", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_financial_dto_1.CreateFinancialDto, Object]),
    __metadata("design:returntype", void 0)
], FinancialController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id/pay'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('method')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], FinancialController.prototype, "markPaid", null);
__decorate([
    (0, common_1.Post)(':id/send-charge'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], FinancialController.prototype, "sendCharge", null);
__decorate([
    (0, common_1.Post)(':id/payment-link'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], FinancialController.prototype, "generatePaymentLink", null);
__decorate([
    (0, common_1.Post)(':id/charge-card'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, charge_card_dto_1.ChargeCardDto, Object, String]),
    __metadata("design:returntype", void 0)
], FinancialController.prototype, "chargeWithCard", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], FinancialController.prototype, "remove", null);
exports.FinancialController = FinancialController = __decorate([
    (0, common_1.Controller)('financial'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [financial_service_1.FinancialService])
], FinancialController);
let AsaasWebhookController = class AsaasWebhookController {
    constructor(svc) {
        this.svc = svc;
    }
    async handle(token, body) {
        const expected = process.env.ASAAS_WEBHOOK_TOKEN;
        if (expected && token !== expected)
            return { ok: false };
        await this.svc.handleAsaasWebhook(body.event, body.payment);
        return { ok: true };
    }
};
exports.AsaasWebhookController = AsaasWebhookController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Headers)('asaas-access-token')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AsaasWebhookController.prototype, "handle", null);
exports.AsaasWebhookController = AsaasWebhookController = __decorate([
    (0, common_1.Controller)('webhooks/asaas'),
    __metadata("design:paramtypes", [financial_service_1.FinancialService])
], AsaasWebhookController);
//# sourceMappingURL=financial.controller.js.map