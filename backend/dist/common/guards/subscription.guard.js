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
exports.SubscriptionGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const passport_1 = require("@nestjs/passport");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const public_route_decorator_1 = require("../decorators/public-route.decorator");
const subscription_entity_1 = require("../../modules/billing/entities/subscription.entity");
const GRACE_PERIOD_DAYS = 3;
let SubscriptionGuard = class SubscriptionGuard extends (0, passport_1.AuthGuard)('jwt') {
    constructor(reflector, subscriptions) {
        super();
        this.reflector = reflector;
        this.subscriptions = subscriptions;
    }
    async canActivate(ctx) {
        const req = ctx.switchToHttp().getRequest();
        if (this.isPublicRoute(ctx) || this.isIgnoredPath(req.path)) {
            return true;
        }
        await super.canActivate(ctx);
        const userId = req.user?.id;
        if (!userId)
            throw new common_1.ForbiddenException('Plano inativo');
        const subscription = await this.subscriptions.findOne({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
        if (!subscription)
            throw new common_1.ForbiddenException('Plano inativo');
        if (subscription.status === 'active' || subscription.status === 'trialing')
            return true;
        if (subscription.status === 'past_due' && this.isWithinGracePeriod(subscription.currentPeriodEnd)) {
            return true;
        }
        throw new common_1.ForbiddenException('Plano inativo');
    }
    isPublicRoute(ctx) {
        return this.reflector.getAllAndOverride(public_route_decorator_1.PUBLIC_ROUTE_KEY, [ctx.getHandler(), ctx.getClass()]) === true;
    }
    isIgnoredPath(path = '') {
        return (path.startsWith('/auth/') ||
            path.startsWith('/public/') ||
            path === '/billing/me' ||
            path === '/billing/webhook' ||
            path === '/billing/tokenize' ||
            path === '/billing/update-card' ||
            path === '/billing/subscribe');
    }
    isWithinGracePeriod(currentPeriodEnd) {
        if (!currentPeriodEnd)
            return false;
        const graceEndsAt = new Date(currentPeriodEnd);
        graceEndsAt.setDate(graceEndsAt.getDate() + GRACE_PERIOD_DAYS);
        return new Date() <= graceEndsAt;
    }
};
exports.SubscriptionGuard = SubscriptionGuard;
exports.SubscriptionGuard = SubscriptionGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(subscription_entity_1.Subscription)),
    __metadata("design:paramtypes", [core_1.Reflector,
        typeorm_2.Repository])
], SubscriptionGuard);
//# sourceMappingURL=subscription.guard.js.map