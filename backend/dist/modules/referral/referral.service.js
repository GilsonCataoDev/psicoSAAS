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
var ReferralService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferralService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const date_fns_1 = require("date-fns");
const referral_entity_1 = require("./entities/referral.entity");
const subscription_entity_1 = require("../subscriptions/entities/subscription.entity");
const email_service_1 = require("../email/email.service");
let ReferralService = ReferralService_1 = class ReferralService {
    constructor(refs, subs, email) {
        this.refs = refs;
        this.subs = subs;
        this.email = email;
        this.logger = new common_1.Logger(ReferralService_1.name);
    }
    async getOrCreateCode(user) {
        let master = await this.refs.findOne({
            where: { referrerId: user.id, referredId: (0, typeorm_2.IsNull)() },
        });
        if (!master) {
            const base = user.name
                .split(' ')[0]
                .toUpperCase()
                .replace(/[^A-Z]/g, '')
                .slice(0, 6);
            const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
            master = this.refs.create({ referrerId: user.id, code: `${base}${suffix}` });
            master = await this.refs.save(master);
        }
        return master.code;
    }
    async applyReferral(code, newUser) {
        const master = await this.refs.findOne({
            where: { code: code.toUpperCase(), referredId: (0, typeorm_2.IsNull)() },
            relations: ['referrer'],
        });
        if (!master)
            return;
        if (master.referrerId === newUser.id)
            return;
        const use = this.refs.create({
            referrerId: master.referrerId,
            code: master.code,
            referredId: newUser.id,
            rewardGranted: false,
        });
        await this.refs.save(use);
        this.logger.log(`[Referral] ${master.referrer.name} indicou ${newUser.name}`);
    }
    async grantRewardIfEligible(newUserId) {
        const use = await this.refs.findOne({
            where: { referredId: newUserId, rewardGranted: false },
            relations: ['referrer'],
        });
        if (!use)
            return;
        const sub = await this.subs.findOne({ where: { userId: use.referrerId } });
        if (sub && (sub.status === 'active' || sub.status === 'trialing')) {
            const currentEnd = sub.currentPeriodEnd ?? new Date();
            sub.currentPeriodEnd = (0, date_fns_1.addMonths)(currentEnd, 1);
            await this.subs.save(sub);
        }
        use.rewardGranted = true;
        use.rewardGrantedAt = new Date();
        await this.refs.save(use);
        await this.email.sendReferralReward(use.referrer.name, use.referrer.email, newUserId).catch(() => { });
        this.logger.log(`[Referral] Recompensa concedida a ${use.referrer.name}`);
    }
    async getStats(userId) {
        const master = await this.refs.findOne({
            where: { referrerId: userId, referredId: (0, typeorm_2.IsNull)() },
        });
        const uses = await this.refs.find({
            where: { referrerId: userId, referredId: (0, typeorm_2.Not)((0, typeorm_2.IsNull)()) },
        });
        return {
            code: master?.code ?? null,
            totalInvited: uses.length,
            totalRewarded: uses.filter(r => r.rewardGranted).length,
        };
    }
};
exports.ReferralService = ReferralService;
exports.ReferralService = ReferralService = ReferralService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(referral_entity_1.Referral)),
    __param(1, (0, typeorm_1.InjectRepository)(subscription_entity_1.Subscription)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        email_service_1.EmailService])
], ReferralService);
//# sourceMappingURL=referral.service.js.map