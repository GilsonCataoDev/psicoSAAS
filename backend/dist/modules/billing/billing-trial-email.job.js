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
var BillingTrialEmailJob_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingTrialEmailJob = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const email_service_1 = require("../email/email.service");
const subscription_entity_1 = require("./entities/subscription.entity");
const DAY_MS = 24 * 60 * 60 * 1000;
let BillingTrialEmailJob = BillingTrialEmailJob_1 = class BillingTrialEmailJob {
    constructor(subscriptions, email) {
        this.subscriptions = subscriptions;
        this.email = email;
        this.logger = new common_1.Logger(BillingTrialEmailJob_1.name);
    }
    onModuleInit() {
        this.timer = setInterval(() => this.run().catch((err) => this.logger.error(err)), DAY_MS);
        setTimeout(() => this.run().catch((err) => this.logger.error(err)), 5000);
    }
    onModuleDestroy() {
        if (this.timer)
            clearInterval(this.timer);
    }
    async run() {
        const trialing = await this.subscriptions.find({
            where: { status: 'trialing' },
            relations: ['user'],
        });
        for (const subscription of trialing) {
            if (!subscription.trialEndsAt || !subscription.user?.email)
                continue;
            const daysLeft = Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / DAY_MS);
            if (daysLeft === 2) {
                await this.email.sendTrialEndingReminder(subscription.user.name, subscription.user.email, 2);
            }
            if (daysLeft === 0) {
                await this.email.send({
                    to: subscription.user.email,
                    subject: 'Vamos cobrar hoje — PsicoSaaS',
                    html: `
            <p>Olá, ${subscription.user.name.split(' ')[0]}.</p>
            <p>Seu teste gratuito termina hoje. A cobrança do seu plano será feita no cartão cadastrado.</p>
          `,
                });
            }
        }
    }
};
exports.BillingTrialEmailJob = BillingTrialEmailJob;
exports.BillingTrialEmailJob = BillingTrialEmailJob = BillingTrialEmailJob_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(subscription_entity_1.Subscription)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        email_service_1.EmailService])
], BillingTrialEmailJob);
//# sourceMappingURL=billing-trial-email.job.js.map