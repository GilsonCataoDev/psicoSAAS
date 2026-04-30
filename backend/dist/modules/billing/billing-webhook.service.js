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
var BillingWebhookService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingWebhookService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const email_service_1 = require("../email/email.service");
const user_entity_1 = require("../auth/entities/user.entity");
const subscription_entity_1 = require("./entities/subscription.entity");
const webhook_event_entity_1 = require("./entities/webhook-event.entity");
let BillingWebhookService = BillingWebhookService_1 = class BillingWebhookService {
    constructor(subscriptions, events, users, cfg, email) {
        this.subscriptions = subscriptions;
        this.events = events;
        this.users = users;
        this.cfg = cfg;
        this.email = email;
        this.logger = new common_1.Logger(BillingWebhookService_1.name);
    }
    isValidOrigin(headers, payload) {
        const expected = this.cfg.get('ASAAS_WEBHOOK_TOKEN');
        if (!expected)
            return true;
        const received = headers['asaas-access-token'] ??
            headers['access_token'] ??
            headers['access-token'] ??
            payload?.accessToken;
        return received === expected;
    }
    async process(payload) {
        const eventType = payload?.event;
        const eventId = this.getEventId(payload);
        this.logger.log(`[Asaas webhook] Recebido event=${eventType} id=${eventId}`);
        if (!eventType || !eventId) {
            this.logger.warn('[Asaas webhook] Payload sem event/eventId processável');
            return;
        }
        const logged = await this.logOnce(eventId, eventType, payload);
        if (!logged) {
            this.logger.log(`[Asaas webhook] Evento duplicado ignorado id=${eventId}`);
            return;
        }
        const subscription = await this.findSubscription(payload);
        if (!subscription) {
            this.logger.warn(`[Asaas webhook] Subscription não encontrada event=${eventType} id=${eventId}`);
            return;
        }
        const previousStatus = subscription.status;
        switch (eventType) {
            case 'PAYMENT_RECEIVED':
            case 'PAYMENT_CONFIRMED':
                subscription.status = 'active';
                subscription.trialEndsAt = null;
                subscription.currentPeriodEnd = this.getCurrentPeriodEnd(payload);
                break;
            case 'PAYMENT_OVERDUE':
                subscription.status = 'past_due';
                subscription.trialEndsAt = null;
                this.sendPaymentFailedEmail(subscription.userId).catch((err) => {
                    this.logger.error('[Asaas webhook] Erro ao enviar email de pagamento recusado', err);
                });
                break;
            case 'SUBSCRIPTION_CANCELLED':
            case 'SUBSCRIPTION_DELETED':
                subscription.status = 'canceled';
                break;
            default:
                this.logger.log(`[Asaas webhook] Evento ignorado event=${eventType}`);
                return;
        }
        await this.subscriptions.save(subscription);
        this.logger.log(`[Asaas webhook] Subscription ${subscription.id} status ${previousStatus} -> ${subscription.status}`);
    }
    async logOnce(eventId, eventType, payload) {
        try {
            await this.events.save(this.events.create({ eventId, eventType, payload }));
            return true;
        }
        catch (err) {
            if (err?.code === '23505' || err?.driverError?.code === '23505')
                return false;
            this.logger.error('[Asaas webhook] Erro ao registrar idempotência', err);
            throw err;
        }
    }
    async findSubscription(payload) {
        const gatewaySubscriptionId = payload?.subscription?.id ?? payload?.payment?.subscription;
        const externalReference = payload?.subscription?.externalReference ??
            payload?.payment?.externalReference;
        if (gatewaySubscriptionId) {
            const byGatewayId = await this.subscriptions.findOne({
                where: { gatewaySubscriptionId },
            });
            if (byGatewayId)
                return byGatewayId;
        }
        if (externalReference) {
            return this.subscriptions.findOne({
                where: { id: externalReference },
            });
        }
        return null;
    }
    getCurrentPeriodEnd(payload) {
        const date = payload?.subscription?.nextDueDate ??
            payload?.payment?.nextDueDate ??
            payload?.payment?.dueDate;
        if (date)
            return new Date(`${date}T00:00:00.000Z`);
        const fallback = new Date();
        fallback.setMonth(fallback.getMonth() + 1);
        return fallback;
    }
    getEventId(payload) {
        const eventType = payload?.event;
        const objectId = payload?.id ??
            payload?.payment?.id ??
            payload?.subscription?.id ??
            payload?.payment?.subscription ??
            payload?.subscription?.externalReference ??
            payload?.payment?.externalReference;
        if (!eventType || !objectId)
            return null;
        return `${eventType}:${objectId}`;
    }
    async sendPaymentFailedEmail(userId) {
        const user = await this.users.findOne({ where: { id: userId } });
        if (!user)
            return;
        await this.email.send({
            to: user.email,
            subject: 'Pagamento recusado — PsicoSaaS',
            html: `
        <p>Olá, ${user.name.split(' ')[0]}.</p>
        <p>Não conseguimos cobrar seu cartão. Atualize o pagamento para continuar usando o PsicoSaaS.</p>
      `,
        });
    }
};
exports.BillingWebhookService = BillingWebhookService;
exports.BillingWebhookService = BillingWebhookService = BillingWebhookService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(subscription_entity_1.Subscription)),
    __param(1, (0, typeorm_1.InjectRepository)(webhook_event_entity_1.WebhookEvent)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        config_1.ConfigService,
        email_service_1.EmailService])
], BillingWebhookService);
//# sourceMappingURL=billing-webhook.service.js.map