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
    premium: 249,
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
    async tokenizeCreditCard(user, input) {
        this.validateCreditCardInput(input);
        try {
            const customer = await this.findOrCreateTokenizationCustomer(user, input.cpfCnpj);
            const { data } = await this.api.post('/creditCard/tokenize', {
                customer,
                creditCard: {
                    holderName: input.holderName,
                    number: input.number,
                    expiryMonth: input.expiryMonth,
                    expiryYear: input.expiryYear,
                    ccv: input.ccv,
                },
                creditCardHolderInfo: {
                    name: input.holderName,
                    email: input.email || user.email,
                    cpfCnpj: input.cpfCnpj,
                    postalCode: input.postalCode,
                    addressNumber: input.addressNumber,
                    phone: input.phone,
                },
                remoteIp: input.remoteIp ?? '0.0.0.0',
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
        const number = input.number?.replace(/\D/g, '');
        const ccv = input.ccv?.replace(/\D/g, '');
        const cpfCnpj = input.cpfCnpj?.replace(/\D/g, '');
        const postalCode = input.postalCode?.replace(/\D/g, '');
        const phone = input.phone?.replace(/\D/g, '');
        if (!input.holderName?.trim())
            throw new common_1.BadRequestException('Nome do cartao e obrigatorio');
        if (!number || number.length < 13 || number.length > 19) {
            throw new common_1.BadRequestException('Numero do cartao invalido');
        }
        if (!/^\d{1,2}$/.test(input.expiryMonth) || Number(input.expiryMonth) < 1 || Number(input.expiryMonth) > 12) {
            throw new common_1.BadRequestException('Mes de validade invalido');
        }
        if (!/^\d{4}$/.test(input.expiryYear)) {
            throw new common_1.BadRequestException('Ano de validade invalido');
        }
        if (!ccv || ccv.length < 3 || ccv.length > 4) {
            throw new common_1.BadRequestException('CVV invalido');
        }
        if (!cpfCnpj || !/^\d{11}$|^\d{14}$/.test(cpfCnpj)) {
            throw new common_1.BadRequestException('CPF/CNPJ invalido');
        }
        if (!postalCode || postalCode.length !== 8) {
            throw new common_1.BadRequestException('CEP invalido');
        }
        if (!input.addressNumber?.trim()) {
            throw new common_1.BadRequestException('Numero do endereco e obrigatorio');
        }
        if (!phone || phone.length < 10 || phone.length > 11) {
            throw new common_1.BadRequestException('Telefone invalido');
        }
    }
    async findOrCreateTokenizationCustomer(user, cpfCnpj) {
        const normalizedCpfCnpj = cpfCnpj?.replace(/\D/g, '') || user.cpfCnpj;
        const { data: list } = await this.api.get('/customers', {
            params: { externalReference: user.id, limit: 1 },
        });
        if (list.data?.length)
            return list.data[0].id;
        const { data } = await this.api.post('/customers', {
            name: user.name,
            email: user.email,
            cpfCnpj: normalizedCpfCnpj,
            externalReference: user.id,
            notificationDisabled: false,
        });
        return data.id;
    }
};
exports.AsaasService = AsaasService;
exports.AsaasService = AsaasService = AsaasService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AsaasService);
//# sourceMappingURL=asaas.service.js.map