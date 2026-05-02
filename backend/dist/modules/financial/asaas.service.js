"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PatientAsaasService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatientAsaasService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
let PatientAsaasService = PatientAsaasService_1 = class PatientAsaasService {
    constructor() {
        this.logger = new common_1.Logger(PatientAsaasService_1.name);
    }
    buildApi(apiKey) {
        const isSandbox = process.env.NODE_ENV !== 'production';
        return axios_1.default.create({
            baseURL: isSandbox
                ? 'https://sandbox.asaas.com/api/v3'
                : 'https://api.asaas.com/v3',
            headers: {
                'access_token': apiKey,
                'Content-Type': 'application/json',
                'User-Agent': 'PsicoSaaS/1.0',
            },
        });
    }
    async findOrCreateCustomer(apiKey, patientId, name, cpfCnpj, email) {
        if (!cpfCnpj) {
            throw new common_1.BadRequestException('O CPF/CNPJ do paciente é obrigatório para cobrança via Asaas. ' +
                'Cadastre-o na ficha do paciente antes de cobrar.');
        }
        const api = this.buildApi(apiKey);
        try {
            const { data: list } = await api.get('/customers', {
                params: { externalReference: patientId, limit: 1 },
            });
            if (list.data?.length) {
                this.logger.log(`[Asaas] Customer existente: ${list.data[0].id} (patientId=${patientId})`);
                return list.data[0].id;
            }
            const payload = {
                name,
                cpfCnpj: cpfCnpj.replace(/\D/g, ''),
                externalReference: patientId,
                notificationDisabled: false,
            };
            if (email)
                payload.email = email;
            const { data: customer } = await api.post('/customers', payload);
            this.logger.log(`[Asaas] Customer criado: ${customer.id} (patientId=${patientId})`);
            return customer.id;
        }
        catch (err) {
            if (err instanceof common_1.BadRequestException)
                throw err;
            const msg = err?.response?.data?.errors?.[0]?.description ?? 'Erro ao criar cliente no Asaas';
            this.logger.error('[Asaas] Erro ao criar customer', err?.response?.data);
            throw new common_1.BadRequestException(msg);
        }
    }
    async tokenizeCard(apiKey, customerId, card, holderInfo, remoteIp) {
        const api = this.buildApi(apiKey);
        const payload = {
            customer: customerId,
            creditCard: {
                holderName: card.holderName,
                number: card.number.replace(/\s/g, ''),
                expiryMonth: card.expiryMonth,
                expiryYear: card.expiryYear,
                ccv: card.ccv,
            },
            remoteIp,
            creditCardHolderInfo: {
                name: holderInfo.name,
                email: holderInfo.email,
                cpfCnpj: holderInfo.cpfCnpj.replace(/\D/g, ''),
                postalCode: holderInfo.postalCode.replace(/\D/g, ''),
                addressNumber: holderInfo.addressNumber,
                addressComplement: holderInfo.addressComplement ?? null,
                phone: holderInfo.phone.replace(/\D/g, ''),
                mobilePhone: holderInfo.mobilePhone?.replace(/\D/g, '') ?? null,
            },
        };
        try {
            const { data } = await api.post('/creditCard/tokenize', payload);
            const token = data?.creditCardToken;
            if (!token)
                throw new common_1.BadRequestException('Tokenização não retornou token');
            this.logger.log(`[Asaas] Cartão tokenizado para customer=${customerId}`);
            return token;
        }
        catch (err) {
            if (err instanceof common_1.BadRequestException)
                throw err;
            const msg = err?.response?.data?.errors?.[0]?.description ?? 'Cartão inválido ou recusado';
            this.logger.error('[Asaas] Erro na tokenização', err?.response?.data);
            throw new common_1.BadRequestException(msg);
        }
    }
    async createInvoicePayment(apiKey, customerId, params) {
        const api = this.buildApi(apiKey);
        try {
            const { data } = await api.post('/payments', {
                customer: customerId,
                billingType: 'UNDEFINED',
                value: params.value,
                dueDate: params.dueDate,
                description: params.description,
                externalReference: params.externalRef,
            });
            return { id: data.id, invoiceUrl: data.invoiceUrl, status: data.status };
        }
        catch (err) {
            const msg = err?.response?.data?.errors?.[0]?.description ?? 'Erro ao gerar link de pagamento';
            this.logger.error('[Asaas] Erro ao criar invoice payment', err?.response?.data);
            throw new common_1.BadRequestException(msg);
        }
    }
    async createCardPayment(apiKey, customerId, params) {
        const api = this.buildApi(apiKey);
        const payload = {
            customer: customerId,
            billingType: 'CREDIT_CARD',
            value: params.value,
            dueDate: params.dueDate,
            description: params.description,
            externalReference: params.externalRef,
            creditCardToken: params.creditCardToken,
            creditCardHolderInfo: {
                name: params.holderInfo.name,
                email: params.holderInfo.email,
                cpfCnpj: params.holderInfo.cpfCnpj.replace(/\D/g, ''),
                postalCode: params.holderInfo.postalCode.replace(/\D/g, ''),
                addressNumber: params.holderInfo.addressNumber,
                addressComplement: params.holderInfo.addressComplement ?? null,
                phone: params.holderInfo.phone.replace(/\D/g, ''),
                mobilePhone: params.holderInfo.mobilePhone?.replace(/\D/g, '') ?? null,
            },
        };
        try {
            const { data } = await api.post('/payments', payload);
            this.logger.log(`[Asaas] Pagamento criado: ${data.id} status=${data.status}`);
            return { id: data.id, status: data.status, invoiceUrl: data.invoiceUrl };
        }
        catch (err) {
            const msg = err?.response?.data?.errors?.[0]?.description ?? 'Erro ao processar pagamento';
            this.logger.error('[Asaas] Erro ao criar pagamento', err?.response?.data);
            throw new common_1.BadRequestException(msg);
        }
    }
};
exports.PatientAsaasService = PatientAsaasService;
exports.PatientAsaasService = PatientAsaasService = PatientAsaasService_1 = __decorate([
    (0, common_1.Injectable)()
], PatientAsaasService);
//# sourceMappingURL=asaas.service.js.map