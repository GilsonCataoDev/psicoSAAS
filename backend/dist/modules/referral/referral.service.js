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
        let ref = await this.refs.findOne({ where: { referrerId: user.id, referredId: undefined } });
        if (ref)
            return ref;
        const base = user.name
            .split(' ')[0]
            .toUpperCase()
            .replace(/[^A-Z]/g, '')
            .slice(0, 6);
        const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
        const code = `${base}${suffix}`;
        ref = this.refs.create({ referrerId: user.id, code });
        return this.refs.save(ref);
    }
    async applyReferral(code, newUser) {
        const ref = await this.refs.findOne({
            where: { code: code.toUpperCase(), referredId: undefined },
            relations: ['referrer'],
        });
        if (!ref || ref.referrerId === newUser.id)
            return;
        ref.referredId = newUser.id;
        await this.refs.save(ref);
        this.logger.log(`[Referral] ${ref.referrer.name} indicou ${newUser.name}`);
    }
    async grantRewardIfEligible(newUserId) {
        const ref = await this.refs.findOne({
            where: { referredId: newUserId, rewardGranted: false },
            relations: ['referrer'],
        });
        if (!ref)
            return;
        const sub = await this.subs.findOne({ where: { userId: ref.referrerId } });
        if (sub && (sub.status === 'active' || sub.status === 'trialing')) {
            const currentEnd = sub.currentPeriodEnd ?? new Date();
            sub.currentPeriodEnd = (0, date_fns_1.addMonths)(currentEnd, 1);
            await this.subs.save(sub);
        }
        ref.rewardGranted = true;
        ref.rewardGrantedAt = new Date();
        await this.refs.save(ref);
        await this.email.sendReferralReward(ref.referrer.name, ref.referrer.email, (await this.refs.findOne({ where: { id: ref.id }, relations: ['referrer'] }))?.referrer?.name ?? 'um novo usuário');
        this.logger.log(`[Referral] Recompensa concedida a ${ref.referrer.name}`);
    }
    async getStats(userId) {
        const refs = await this.refs.find({ where: { referrerId: userId } });
        return {
            totalInvited: refs.filter(r => r.referredId).length,
            totalRewarded: refs.filter(r => r.rewardGranted).length,
            code: refs[0]?.code ?? null,
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