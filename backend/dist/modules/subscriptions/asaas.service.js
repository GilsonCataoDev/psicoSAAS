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
var AsaasService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsaasService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
const PLAN_PRICES = {
    essencial: { monthly: 79, yearly: 63 },
    pro: { monthly: 149, yearly: 119 },
    premium: { monthly: 249, yearly: 199 },
};
let AsaasService = AsaasService_1 = class AsaasService {
    constructor(cfg) {
        this.cfg = cfg;
        this.logger = new common_1.Logger(AsaasService_1.name);
        this.isSandbox = cfg.get('NODE_ENV') !== 'production';
        const baseURL = this.isSandbox
            ? 'https://sandbox.asaas.com/api/v3'
            : 'https://api.asaas.com/v3';
        this.api = axios_1.default.create({
            baseURL,
            headers: {
                'access_token': cfg.getOrThrow('ASAAS_API_KEY'),
                'Content-Type': 'application/json',
                'User-Agent': 'PsicoSaaS/1.0',
            },
        });
    }
    async findOrCreateCustomer(userId, name, email, cpfCnpj) {
        try {
            const { data: list } = await this.api.get('/customers', {
                params: { externalReference: userId, limit: 1 },
            });
            if (list.data?.length)
                return list.data[0].id;
            const { data: customer } = await this.api.post('/customers', {
                name,
                email,
                cpfCnpj,
                externalReference: userId,
                notificationDisabled: false,
            });
            this.logger.log(`[Asaas] Customer criado: ${customer.id} para userId=${userId}`);
            return customer.id;
        }
        catch (err) {
            this.logger.error('[Asaas] Erro ao criar customer', err?.response?.data);
            throw new common_1.BadRequestException(err?.response?.data?.errors?.[0]?.description ?? 'Erro ao criar cliente no Asaas');
        }
    }
    async createSubscription(dto) {
        const price = PLAN_PRICES[dto.planId]?.[dto.yearly ? 'yearly' : 'monthly'];
        if (!price)
            throw new common_1.BadRequestException('Plano inválido');
        const nextDueDate = new Date();
        nextDueDate.setDate(nextDueDate.getDate() + 1);
        const payload = {
            customer: dto.customerId,
            billingType: dto.billingType,
            value: price,
            nextDueDate: nextDueDate.toISOString().split('T')[0],
            cycle: dto.yearly ? 'YEARLY' : 'MONTHLY',
            description: `PsicoSaaS — Plano ${dto.planId.charAt(0).toUpperCase() + dto.planId.slice(1)}`,
            externalReference: dto.planId,
        };
        if (dto.billingType === 'CREDIT_CARD' && dto.creditCard) {
            payload.creditCard = dto.creditCard;
            payload.creditCardHolderInfo = dto.creditCardHolderInfo;
            payload.remoteIp = dto.remoteIp ?? '0.0.0.0';
        }
        try {
            const { data } = await this.api.post('/subscriptions', payload);
            this.logger.log(`[Asaas] Assinatura criada: ${data.id} (${dto.billingType})`);
            return data;
        }
        catch (err) {
            const msg = err?.response?.data?.errors?.[0]?.description ?? 'Erro ao criar assinatura';
            this.logger.error('[Asaas] Erro ao criar assinatura', err?.response?.data);
            throw new common_1.BadRequestException(msg);
        }
    }
    async cancelSubscription(asaasSubscriptionId) {
        try {
            await this.api.delete(`/subscriptions/${asaasSubscriptionId}`);
            this.logger.log(`[Asaas] Assinatura cancelada: ${asaasSubscriptionId}`);
        }
        catch (err) {
            this.logger.error('[Asaas] Erro ao cancelar', err?.response?.data);
            throw new common_1.BadRequestException('Erro ao cancelar assinatura');
        }
    }
    async getSubscription(asaasSubscriptionId) {
        const { data } = await this.api.get(`/subscriptions/${asaasSubscriptionId}`);
        return data;
    }
    async getPaymentLink(asaasSubscriptionId) {
        try {
            const { data: charges } = await this.api.get(`/subscriptions/${asaasSubscriptionId}/payments`, {
                params: { limit: 1, offset: 0 },
            });
            const payment = charges.data?.[0];
            if (!payment)
                return {};
            if (payment.billingType === 'PIX') {
                const { data: pix } = await this.api.get(`/payments/${payment.id}/pixQrCode`);
                return { pixCode: pix.payload, pixQrCode: pix.encodedImage };
            }
            if (payment.billingType === 'BOLETO') {
                return { boletoUrl: payment.bankSlipUrl, boletoLine: payment.nossoNumero };
            }
            return {};
        }
        catch {
            return {};
        }
    }
    validateWebhookToken(token) {
        return token === this.cfg.get('ASAAS_WEBHOOK_TOKEN');
    }
};
exports.AsaasService = AsaasService;
exports.AsaasService = AsaasService = AsaasService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AsaasService);
//# sourceMappingURL=asaas.service.js.map