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
var FinancialService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const financial_record_entity_1 = require("./entities/financial-record.entity");
const asaas_service_1 = require("./asaas.service");
const notifications_service_1 = require("../notifications/notifications.service");
const user_entity_1 = require("../auth/entities/user.entity");
const patient_entity_1 = require("../patients/entities/patient.entity");
let FinancialService = FinancialService_1 = class FinancialService {
    constructor(repo, users, patients, asaas, notifications) {
        this.repo = repo;
        this.users = users;
        this.patients = patients;
        this.asaas = asaas;
        this.notifications = notifications;
        this.logger = new common_1.Logger(FinancialService_1.name);
    }
    findAll(psychologistId, status, patientId) {
        const where = { psychologistId };
        if (status)
            where.status = status;
        if (patientId)
            where.patientId = patientId;
        return this.repo.find({ where, relations: ['patient'], order: { createdAt: 'DESC' } });
    }
    async findOne(id, psychologistId) {
        const r = await this.repo.findOne({ where: { id } });
        if (!r)
            throw new common_1.NotFoundException();
        if (r.psychologistId !== psychologistId)
            throw new common_1.ForbiddenException();
        return r;
    }
    findBySessionId(sessionId, psychologistId) {
        return this.repo.findOne({ where: { sessionId, psychologistId } });
    }
    create(dto, psychologistId) {
        const record = this.repo.create({ ...dto, psychologistId });
        return this.repo.save(record);
    }
    async markPaid(id, method, psychologistId) {
        const r = await this.findOne(id, psychologistId);
        r.status = 'paid';
        r.paidAt = new Date().toISOString();
        r.method = method;
        return this.repo.save(r);
    }
    async resetToPending(id, psychologistId) {
        const r = await this.findOne(id, psychologistId);
        r.status = 'pending';
        r.paidAt = undefined;
        r.method = undefined;
        return this.repo.save(r);
    }
    async sendChargeMessage(id, psychologistId) {
        const record = await this.findOne(id, psychologistId);
        const user = await this.users.findOneBy({ id: psychologistId });
        const pixKey = user?.preferences?.pixKey ?? undefined;
        await this.notifications.sendPaymentRequest(record.patient, Number(record.amount), pixKey);
        return { message: 'Cobrança enviada via WhatsApp ✓' };
    }
    async generatePaymentLink(id, psychologistId) {
        const record = await this.repo.findOne({ where: { id }, relations: ['patient'] });
        if (!record)
            throw new common_1.NotFoundException();
        if (record.psychologistId !== psychologistId)
            throw new common_1.ForbiddenException();
        const user = await this.users.findOneBy({ id: psychologistId });
        const apiKey = user?.preferences?.asaasApiKey;
        if (!apiKey) {
            throw new common_1.BadRequestException('Configure sua chave Asaas em Configurações → Pagamentos para gerar links de cobrança.');
        }
        if (record.paymentLinkUrl && record.status !== 'paid') {
            return { url: record.paymentLinkUrl };
        }
        const patient = record.patient;
        const cpfCnpj = patient?.cpfCnpj;
        const patientName = patient?.name ?? record.description;
        const customerId = await this.asaas.findOrCreateCustomer(apiKey, record.patientId ?? id, patientName, cpfCnpj ?? '', patient?.email);
        if (patient && !patient.asaasCustomerId) {
            await this.patients.update(patient.id, { asaasCustomerId: customerId });
        }
        const dueDate = record.dueDate
            ?? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const payment = await this.asaas.createInvoicePayment(apiKey, customerId, {
            value: Number(record.amount),
            dueDate,
            description: record.description,
            externalRef: id,
        });
        record.asaasPaymentId = payment.id;
        record.paymentLinkUrl = payment.invoiceUrl;
        await this.repo.save(record);
        this.logger.log(`[Asaas] Link gerado: ${payment.invoiceUrl} (paymentId=${payment.id})`);
        return { url: payment.invoiceUrl };
    }
    async chargeWithCard(id, psychologistId, dto, remoteIp) {
        const record = await this.repo.findOne({ where: { id }, relations: ['patient'] });
        if (!record)
            throw new common_1.NotFoundException();
        if (record.psychologistId !== psychologistId)
            throw new common_1.ForbiddenException();
        if (record.status === 'paid')
            throw new common_1.BadRequestException('Este lançamento já foi pago.');
        const user = await this.users.findOneBy({ id: psychologistId });
        const apiKey = user?.preferences?.asaasApiKey;
        if (!apiKey) {
            throw new common_1.BadRequestException('Configure sua chave Asaas em Configurações → Pagamentos para cobrar por cartão.');
        }
        const patient = record.patient;
        const cpfCnpj = dto.creditCardHolderInfo.cpfCnpj || patient?.cpfCnpj;
        const customerId = await this.asaas.findOrCreateCustomer(apiKey, record.patientId ?? id, dto.creditCardHolderInfo.name, cpfCnpj ?? '', dto.creditCardHolderInfo.email);
        if (patient && !patient.asaasCustomerId) {
            await this.patients.update(patient.id, { asaasCustomerId: customerId });
        }
        const creditCardToken = await this.asaas.tokenizeCard(apiKey, customerId, dto.creditCard, dto.creditCardHolderInfo, remoteIp);
        const dueDate = record.dueDate ?? new Date().toISOString().split('T')[0];
        const payment = await this.asaas.createCardPayment(apiKey, customerId, {
            value: Number(record.amount),
            dueDate,
            description: record.description,
            externalRef: id,
            creditCardToken,
            holderInfo: dto.creditCardHolderInfo,
        });
        record.status = 'paid';
        record.paidAt = new Date().toISOString();
        record.method = 'credit_card';
        record.asaasPaymentId = payment.id;
        await this.repo.save(record);
        if (patient && !patient.cpfCnpj && cpfCnpj) {
            await this.patients.update(patient.id, { cpfCnpj: cpfCnpj.replace(/\D/g, '') });
        }
        this.logger.log(`[Asaas] Cobrança por cartão confirmada: paymentId=${payment.id}`);
        return { message: 'Cobrança realizada com sucesso', paymentId: payment.id };
    }
    async handleAsaasWebhook(event, payment) {
        if (event !== 'PAYMENT_RECEIVED' && event !== 'PAYMENT_CONFIRMED')
            return;
        const internalId = payment.externalReference;
        if (!internalId)
            return;
        const record = await this.repo.findOne({ where: { id: internalId } });
        if (!record || record.status === 'paid')
            return;
        record.status = 'paid';
        record.paidAt = new Date().toISOString();
        record.method = payment.billingType === 'CREDIT_CARD' ? 'credit_card'
            : payment.billingType === 'PIX' ? 'pix'
                : payment.billingType === 'BOLETO' ? 'transfer'
                    : 'manual';
        await this.repo.save(record);
        this.logger.log(`[Asaas Webhook] Pagamento ${record.id} marcado como pago (${record.method})`);
    }
    async remove(id, psychologistId) {
        const r = await this.findOne(id, psychologistId);
        await this.repo.remove(r);
        return { deleted: true };
    }
    async getSummary(psychologistId) {
        const records = await this.repo.find({ where: { psychologistId } });
        const income = records.filter(r => r.type === 'income');
        return {
            totalRevenue: income.reduce((s, r) => s + Number(r.amount), 0),
            paid: income.filter(r => r.status === 'paid').reduce((s, r) => s + Number(r.amount), 0),
            pending: income.filter(r => r.status === 'pending').reduce((s, r) => s + Number(r.amount), 0),
            overdue: income.filter(r => r.status === 'overdue').reduce((s, r) => s + Number(r.amount), 0),
        };
    }
};
exports.FinancialService = FinancialService;
exports.FinancialService = FinancialService = FinancialService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(financial_record_entity_1.FinancialRecord)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(2, (0, typeorm_1.InjectRepository)(patient_entity_1.Patient)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        asaas_service_1.PatientAsaasService,
        notifications_service_1.NotificationsService])
], FinancialService);
//# sourceMappingURL=financial.service.js.map