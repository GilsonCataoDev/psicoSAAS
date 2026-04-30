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
    basic: 79,
    premium: 249,
    essencial: 79,
    pro: 149,
};
let AsaasService = AsaasService_1 = class AsaasService {
    constructor(cfg) {
        this.cfg = cfg;
        this.logger = new common_1.Logger(AsaasService_1.name);
        this.api = axios_1.default.create({
            baseURL: this.cfg.get('ASAAS_BASE_URL') ?? 'https://sandbox.asaas.com/api/v3',
            headers: {
                access_token: this.cfg.getOrThrow('ASAAS_API_KEY'),
                'Content-Type': 'application/json',
                'User-Agent': 'PsicoSaaS/1.0',
            },
        });
    }
    async createCustomer(user) {
        try {
            const { data } = await this.api.post('/customers', {
                name: user.name,
                email: user.email,
                externalReference: user.id,
            });
            return data.id;
        }
        catch (err) {
            this.logger.error('[Asaas] Erro ao criar customer', err?.response?.data ?? err);
            throw new common_1.BadRequestException(err?.response?.data?.errors?.[0]?.description ?? 'Erro ao criar cliente no Asaas');
        }
    }
    async tokenizeCreditCard(input) {
        this.validateCreditCardInput(input);
        try {
            const { data } = await this.api.post('/creditCard/tokenize', {
                creditCard: {
                    holderName: input.holderName,
                    number: input.number,
                    expiryMonth: input.expiryMonth,
                    expiryYear: input.expiryYear,
                    ccv: input.ccv,
                },
            });
            const token = data?.creditCardToken ?? data?.token;
            if (!token)
                throw new common_1.BadRequestException('Não foi possível tokenizar o cartão');
            return token;
        }
        catch (err) {
            if (err instanceof common_1.BadRequestException)
                throw err;
            this.logger.warn('[Asaas] Falha ao tokenizar cartão');
            throw new common_1.BadRequestException(err?.response?.data?.errors?.[0]?.description ?? 'Cartão inválido');
        }
    }
    async createSubscription(customerId, plan, externalReference, creditCardToken, nextDueDate = this.addDays(7)) {
        const value = PLAN_PRICES[plan];
        if (!value)
            throw new common_1.BadRequestException('Plano inválido');
        try {
            const { data } = await this.api.post('/subscriptions', {
                customer: customerId,
                billingType: 'CREDIT_CARD',
                value,
                nextDueDate,
                cycle: 'MONTHLY',
                description: `PsicoSaaS - Plano ${plan}`,
                externalReference,
                creditCardToken,
            });
            return data.id;
        }
        catch (err) {
            this.logger.error('[Asaas] Erro ao criar subscription', err?.response?.data ?? err);
            throw new common_1.BadRequestException(err?.response?.data?.errors?.[0]?.description ?? 'Erro ao criar assinatura no Asaas');
        }
    }
    async updateSubscriptionCreditCard(subscriptionId, creditCardToken) {
        try {
            await this.api.put(`/subscriptions/${subscriptionId}/creditCard`, {
                creditCardToken,
                updatePendingPayments: true,
            });
        }
        catch (err) {
            this.logger.warn('[Asaas] Falha ao atualizar cartão da assinatura');
            throw new common_1.BadRequestException(err?.response?.data?.errors?.[0]?.description ?? 'Não foi possível atualizar o cartão');
        }
    }
    async retryLatestSubscriptionPayment(subscriptionId, creditCardToken) {
        try {
            const { data } = await this.api.get(`/subscriptions/${subscriptionId}/payments`, {
                params: { limit: 1, offset: 0 },
            });
            const payment = data?.data?.[0];
            if (!payment?.id)
                return;
            if (!['OVERDUE', 'PENDING'].includes(payment.status))
                return;
            await this.api.post(`/payments/${payment.id}/payWithCreditCard`, {
                creditCardToken,
            });
        }
        catch (err) {
            this.logger.warn('[Asaas] Falha ao tentar nova cobrança');
            throw new common_1.BadRequestException(err?.response?.data?.errors?.[0]?.description ?? 'Não foi possível tentar a cobrança novamente');
        }
    }
    addDays(days) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    }
    validateCreditCardInput(input) {
        const number = input.number?.replace(/\D/g, '');
        const ccv = input.ccv?.replace(/\D/g, '');
        if (!input.holderName?.trim())
            throw new common_1.BadRequestException('Nome do cartão é obrigatório');
        if (!number || number.length < 13 || number.length > 19) {
            throw new common_1.BadRequestException('Número do cartão inválido');
        }
        if (!/^\d{1,2}$/.test(input.expiryMonth) || Number(input.expiryMonth) < 1 || Number(input.expiryMonth) > 12) {
            throw new common_1.BadRequestException('Mês de validade inválido');
        }
        if (!/^\d{4}$/.test(input.expiryYear)) {
            throw new common_1.BadRequestException('Ano de validade inválido');
        }
        if (!ccv || ccv.length < 3 || ccv.length > 4) {
            throw new common_1.BadRequestException('CVV inválido');
        }
    }
};
exports.AsaasService = AsaasService;
exports.AsaasService = AsaasService = AsaasService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AsaasService);
//# sourceMappingURL=asaas.service.js.map