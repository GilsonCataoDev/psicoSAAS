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
var SubscriptionsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const date_fns_1 = require("date-fns");
const subscription_entity_1 = require("./entities/subscription.entity");
const asaas_service_1 = require("./asaas.service");
let SubscriptionsService = SubscriptionsService_1 = class SubscriptionsService {
    constructor(repo, asaas) {
        this.repo = repo;
        this.asaas = asaas;
        this.logger = new common_1.Logger(SubscriptionsService_1.name);
    }
    async getByUserId(userId) {
        return this.repo.findOne({ where: { userId } });
    }
    async getOrCreateTrial(userId) {
        let sub = await this.repo.findOne({ where: { userId } });
        if (sub)
            return sub;
        sub = this.repo.create({
            userId,
            planId: 'essencial',
            status: 'trialing',
            trialEndsAt: (0, date_fns_1.addDays)(new Date(), 14),
        });
        return this.repo.save(sub);
    }
    async subscribe(user, dto, remoteIp) {
        let sub = await this.repo.findOne({ where: { userId: user.id } });
        let asaasCustomerId = sub?.asaasCustomerId;
        if (!asaasCustomerId) {
            asaasCustomerId = await this.asaas.findOrCreateCustomer(user.id, user.name, user.email, dto.cpfCnpj);
        }
        const asaasDto = {
            customerId: asaasCustomerId,
            planId: dto.planId,
            billingType: dto.billingType,
            yearly: dto.yearly,
            ...(dto.creditCard && {
                creditCard: dto.creditCard,
                creditCardHolderInfo: dto.creditCardHolderInfo,
                remoteIp,
            }),
        };
        const asaasSub = await this.asaas.createSubscription(asaasDto);
        if (!sub)
            sub = this.repo.create({ userId: user.id });
        sub.asaasCustomerId = asaasCustomerId;
        sub.asaasSubscriptionId = asaasSub.id;
        sub.planId = dto.planId;
        sub.billingType = dto.billingType;
        sub.yearly = dto.yearly;
        if (dto.billingType === 'CREDIT_CARD') {
            sub.status = 'active';
            sub.currentPeriodEnd = dto.yearly
                ? (0, date_fns_1.addYears)(new Date(), 1)
                : (0, date_fns_1.addMonths)(new Date(), 1);
        }
        else {
            sub.status = 'trialing';
        }
        const saved = await this.repo.save(sub);
        let paymentLink = {};
        if (dto.billingType !== 'CREDIT_CARD') {
            paymentLink = await this.asaas.getPaymentLink(asaasSub.id);
        }
        return { subscription: saved, ...paymentLink };
    }
    async handleWebhook(event) {
        const { event: type, payment, subscription: asaasSub } = event;
        this.logger.log(`[Webhook Asaas] ${type}`);
        const sub = asaasSub?.id
            ? await this.repo.findOne({ where: { asaasSubscriptionId: asaasSub.id } })
            : payment?.subscription
                ? await this.repo.findOne({ where: { asaasSubscriptionId: payment.subscription } })
                : null;
        if (!sub)
            return;
        switch (type) {
            case 'PAYMENT_CONFIRMED':
            case 'PAYMENT_RECEIVED':
                sub.status = 'active';
                sub.currentPeriodEnd = sub.yearly
                    ? (0, date_fns_1.addYears)(new Date(), 1)
                    : (0, date_fns_1.addMonths)(new Date(), 1);
                break;
            case 'PAYMENT_OVERDUE':
                sub.status = 'past_due';
                break;
            case 'SUBSCRIPTION_DELETED':
            case 'PAYMENT_REFUNDED':
                sub.status = 'cancelled';
                sub.cancelAtPeriodEnd = false;
                break;
        }
        await this.repo.save(sub);
    }
    async cancel(userId) {
        const sub = await this.repo.findOne({ where: { userId } });
        if (!sub)
            throw new common_1.NotFoundException();
        if (sub.asaasSubscriptionId) {
            await this.asaas.cancelSubscription(sub.asaasSubscriptionId);
        }
        sub.status = 'cancelled';
        sub.cancelAtPeriodEnd = false;
        return this.repo.save(sub);
    }
};
exports.SubscriptionsService = SubscriptionsService;
exports.SubscriptionsService = SubscriptionsService = SubscriptionsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(subscription_entity_1.Subscription)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        asaas_service_1.AsaasService])
], SubscriptionsService);
//# sourceMappingURL=subscriptions.service.js.map