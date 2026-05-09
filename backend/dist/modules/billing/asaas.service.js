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
    essencial: 79,
    pro: 149,
};
let AsaasService = AsaasService_1 = class AsaasService {
    constructor(cfg) {
        this.cfg = cfg;
        this.logger = new common_1.Logger(AsaasService_1.name);
        const defaultBaseUrl = this.cfg.get('NODE_ENV') === 'production'
            ? 'https://api.asaas.com/v3'
            : 'https://sandbox.asaas.com/api/v3';
        this.api = axios_1.default.create({
            baseURL: this.cfg.get('ASAAS_BASE_URL') ?? defaultBaseUrl,
            headers: {
                access_token: this.cfg.getOrThrow('ASAAS_API_KEY'),
                'Content-Type': 'application/json',
                'User-Agent': 'PsicoSaaS/1.0',
            },
        });
    }
    async createCustomer(user) {
        try {
            const { data: list } = await this.api.get('/customers', {
                params: { externalReference: user.id, limit: 1 },
            });
            if (list.data?.length)
                return list.data[0].id;
            const { data } = await this.api.post('/customers', {
                name: user.name,
                email: user.email,
                cpfCnpj: user.cpfCnpj,
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
                customer: input.customerId,
                creditCard: {
                    holderName: input.creditCard.holderName,
                    number: input.creditCard.number,
                    expiryMonth: input.creditCard.expiryMonth,
                    expiryYear: input.creditCard.expiryYear,
                    ccv: input.creditCard.ccv,
                },
                creditCardHolderInfo: {
                    name: input.creditCardHolderInfo.name,
                    email: input.creditCardHolderInfo.email,
                    cpfCnpj: input.creditCardHolderInfo.cpfCnpj,
                    postalCode: input.creditCardHolderInfo.postalCode,
                    addressNumber: input.creditCardHolderInfo.addressNumber,
                    phone: input.creditCardHolderInfo.phone,
                },
                remoteIp: input.remoteIp,
            });
            const token = data?.creditCardToken ?? data?.token;
            if (!token)
                throw new common_1.BadRequestException('Nao foi possivel tokenizar o cartao');
            return token;
        }
        catch (err) {
            if (err instanceof common_1.BadRequestException)
                throw err;
            this.logger.warn('[Asaas] Falha ao tokenizar cartao', err?.response?.data ?? err);
            throw new common_1.BadRequestException(err?.response?.data?.errors?.[0]?.description ?? 'Cartao invalido');
        }
    }
    async createSubscription(customerId, plan, externalReference, creditCardToken, nextDueDate = this.addDays(7)) {
        const value = PLAN_PRICES[plan];
        if (!value)
            throw new common_1.BadRequestException('Plano invalido');
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
            this.logger.warn('[Asaas] Falha ao atualizar cartao da assinatura');
            throw new common_1.BadRequestException(err?.response?.data?.errors?.[0]?.description ?? 'Nao foi possivel atualizar o cartao');
        }
    }
    async cancelSubscription(subscriptionId) {
        try {
            await this.api.delete(`/subscriptions/${subscriptionId}`);
            this.logger.log(`[Asaas] Assinatura cancelada: ${subscriptionId}`);
        }
        catch (err) {
            this.logger.warn('[Asaas] Falha ao cancelar assinatura', err?.response?.data ?? err);
            throw new common_1.BadRequestException(err?.response?.data?.errors?.[0]?.description ?? 'Nao foi possivel cancelar a assinatura');
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
            this.logger.warn('[Asaas] Falha ao tentar nova cobranca');
            throw new common_1.BadRequestException(err?.response?.data?.errors?.[0]?.description ?? 'Nao foi possivel tentar a cobranca novamente');
        }
    }
    addDays(days) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    }
    validateCreditCardInput(input) {
        const number = input.creditCard?.number?.replace(/\D/g, '');
        const ccv = input.creditCard?.ccv?.replace(/\D/g, '');
        const cpfCnpj = input.creditCardHolderInfo?.cpfCnpj?.replace(/\D/g, '');
        const postalCode = input.creditCardHolderInfo?.postalCode?.replace(/\D/g, '');
        const phone = input.creditCardHolderInfo?.phone?.replace(/\D/g, '');
        if (!input.customerId?.trim())
            throw new common_1.BadRequestException('Cliente Asaas e obrigatorio');
        if (!input.remoteIp?.trim())
            throw new common_1.BadRequestException('IP remoto e obrigatorio');
        if (!input.creditCard?.holderName?.trim())
            throw new common_1.BadRequestException('Nome do cartao e obrigatorio');
        if (!number || number.length < 13 || number.length > 19) {
            throw new common_1.BadRequestException('Numero do cartao invalido');
        }
        if (!/^\d{1,2}$/.test(input.creditCard.expiryMonth) || Number(input.creditCard.expiryMonth) < 1 || Number(input.creditCard.expiryMonth) > 12) {
            throw new common_1.BadRequestException('Mes de validade invalido');
        }
        if (!/^\d{4}$/.test(input.creditCard.expiryYear)) {
            throw new common_1.BadRequestException('Ano de validade invalido');
        }
        if (!ccv || ccv.length < 3 || ccv.length > 4) {
            throw new common_1.BadRequestException('CVV invalido');
        }
        if (!input.creditCardHolderInfo.name?.trim()) {
            throw new common_1.BadRequestException('Nome do titular e obrigatorio');
        }
        if (!input.creditCardHolderInfo.email?.trim()) {
            throw new common_1.BadRequestException('E-mail do titular e obrigatorio');
        }
        if (!cpfCnpj || !/^\d{11}$|^\d{14}$/.test(cpfCnpj)) {
            throw new common_1.BadRequestException('CPF/CNPJ invalido');
        }
        if (!postalCode || postalCode.length !== 8) {
            throw new common_1.BadRequestException('CEP invalido');
        }
        if (!input.creditCardHolderInfo.addressNumber?.trim()) {
            throw new common_1.BadRequestException('Numero do endereco e obrigatorio');
        }
        if (!phone || phone.length < 10 || phone.length > 11) {
            throw new common_1.BadRequestException('Telefone invalido');
        }
    }
};
exports.AsaasService = AsaasService;
exports.AsaasService = AsaasService = AsaasService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AsaasService);
//# sourceMappingURL=asaas.service.js.map