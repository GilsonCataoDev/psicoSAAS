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
exports.BillingService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const asaas_service_1 = require("./asaas.service");
const subscription_entity_1 = require("./entities/subscription.entity");
const TRIAL_DAYS = 7;
const PLAN_PRICES = { essencial: 79, pro: 149, premium: 249 };
let BillingService = class BillingService {
    constructor(repo, asaas) {
        this.repo = repo;
        this.asaas = asaas;
    }
    async getMine(userId) {
        const subscription = await this.repo.findOne({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
        if (!subscription)
            return { status: 'none' };
        if (subscription.cancelAtPeriodEnd
            && subscription.currentPeriodEnd
            && new Date(subscription.currentPeriodEnd).getTime() <= Date.now()) {
            subscription.status = 'canceled';
            subscription.cancelAtPeriodEnd = false;
            return this.repo.save(subscription);
        }
        return subscription;
    }
    async subscribe(user, plan = 'pro', creditCardToken) {
        if (!PLAN_PRICES[plan])
            throw new common_1.BadRequestException('Plano invalido');
        if (!creditCardToken) {
            throw new common_1.BadRequestException('Cartão de crédito obrigatório para iniciar o teste');
        }
        const existing = await this.repo.findOne({
            where: { userId: user.id },
            order: { createdAt: 'DESC' },
        });
        const canUpgradeFromFree = existing?.status === 'active' && existing.plan === 'free' && !existing.gatewaySubscriptionId;
        const canAttachPaymentToLocalTrial = existing?.status === 'trialing' && !existing.gatewaySubscriptionId;
        if ((existing?.status === 'active' || existing?.status === 'trialing')
            && !canUpgradeFromFree
            && !canAttachPaymentToLocalTrial) {
            throw new common_1.ConflictException('Usuario ja possui uma assinatura ativa');
        }
        const shouldStartTrial = !existing?.hasUsedTrial;
        const trialEndsAt = shouldStartTrial ? new Date(Date.now() + TRIAL_DAYS * 86400000) : null;
        const nextDueDate = shouldStartTrial ? this.asaas.addDays(TRIAL_DAYS) : this.asaas.addDays(1);
        const subscription = existing ?? this.repo.create({ userId: user.id });
        Object.assign(subscription, {
            userId: user.id,
            plan,
            status: shouldStartTrial ? 'trialing' : 'active',
            trialEndsAt,
            hasUsedTrial: true,
            currentPeriodEnd: null,
        });
        const saved = await this.repo.save(subscription);
        const gatewayCustomerId = saved.gatewayCustomerId ?? await this.asaas.createCustomer(user);
        const gatewaySubscriptionId = await this.asaas.createSubscription(gatewayCustomerId, plan, saved.id, creditCardToken, nextDueDate);
        Object.assign(saved, {
            gatewayCustomerId,
            gatewaySubscriptionId,
            status: shouldStartTrial ? 'trialing' : 'active',
            trialEndsAt,
            hasUsedTrial: true,
            currentPeriodEnd: null,
        });
        return this.repo.save(saved);
    }
    async activateFree(userId) {
        const existing = await this.repo.findOne({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
        if (existing?.gatewaySubscriptionId && existing.status !== 'canceled') {
            throw new common_1.ConflictException('Cancele a assinatura atual antes de migrar para o plano gratis');
        }
        const subscription = existing ?? this.repo.create({ userId });
        Object.assign(subscription, {
            userId,
            plan: 'free',
            status: 'active',
            currentPeriodEnd: null,
            trialEndsAt: null,
            cancelAtPeriodEnd: false,
        });
        return this.repo.save(subscription);
    }
    async updateCard(userId, creditCardToken) {
        if (!creditCardToken)
            throw new common_1.BadRequestException('creditCardToken é obrigatório');
        const subscription = await this.repo.findOne({
            where: { userId, status: (0, typeorm_2.In)(['active', 'past_due']) },
            order: { createdAt: 'DESC' },
        });
        if (!subscription?.gatewaySubscriptionId) {
            throw new common_1.BadRequestException('Subscription não encontrada');
        }
        await this.asaas.updateSubscriptionCreditCard(subscription.gatewaySubscriptionId, creditCardToken);
        if (subscription.status === 'past_due') {
            await this.asaas.retryLatestSubscriptionPayment(subscription.gatewaySubscriptionId, creditCardToken);
        }
        return this.repo.save(subscription);
    }
    async cancel(userId) {
        const subscription = await this.repo.findOne({
            where: { userId, status: (0, typeorm_2.In)(['active', 'trialing', 'past_due']) },
            order: { createdAt: 'DESC' },
        });
        if (!subscription)
            throw new common_1.NotFoundException('Assinatura ativa nao encontrada');
        if (subscription.gatewaySubscriptionId) {
            await this.asaas.cancelSubscription(subscription.gatewaySubscriptionId);
        }
        const periodEnd = subscription.currentPeriodEnd
            ? new Date(subscription.currentPeriodEnd)
            : null;
        if (subscription.status === 'active' && periodEnd && periodEnd.getTime() > Date.now()) {
            subscription.cancelAtPeriodEnd = true;
            return this.repo.save(subscription);
        }
        subscription.status = 'canceled';
        subscription.cancelAtPeriodEnd = false;
        subscription.currentPeriodEnd = new Date();
        subscription.trialEndsAt = null;
        return this.repo.save(subscription);
    }
    async getMetrics() {
        const [active, trialing, pastDue, canceled] = await Promise.all([
            this.repo.count({ where: { status: 'active' } }),
            this.repo.count({ where: { status: 'trialing' } }),
            this.repo.count({ where: { status: 'past_due' } }),
            this.repo.count({ where: { status: 'canceled' } }),
        ]);
        const activeSubs = await this.repo.find({ where: { status: 'active' } });
        const mrr = activeSubs.reduce((sum, sub) => sum + (PLAN_PRICES[sub.plan] ?? 0), 0);
        return { active, trialing, past_due: pastDue, canceled, mrr };
    }
};
exports.BillingService = BillingService;
exports.BillingService = BillingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(subscription_entity_1.Subscription)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        asaas_service_1.AsaasService])
], BillingService);
//# sourceMappingURL=billing.service.js.map