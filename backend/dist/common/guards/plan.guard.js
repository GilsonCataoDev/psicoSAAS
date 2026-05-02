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
exports.PlanGuard = exports.PLAN_LIMITS = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const require_plan_decorator_1 = require("../decorators/require-plan.decorator");
const subscription_entity_1 = require("../../modules/billing/entities/subscription.entity");
const PLAN_ORDER = { free: 0, basic: 1, essencial: 1, pro: 2, premium: 3 };
exports.PLAN_LIMITS = {
    free: { maxPatients: 2, maxDocuments: 10 },
    basic: { maxPatients: 30, maxDocuments: 200 },
    essencial: { maxPatients: 30, maxDocuments: 200 },
    pro: { maxPatients: -1, maxDocuments: -1 },
    premium: { maxPatients: -1, maxDocuments: -1 },
};
let PlanGuard = class PlanGuard {
    constructor(reflector, subs) {
        this.reflector = reflector;
        this.subs = subs;
    }
    async canActivate(ctx) {
        const requiredPlan = this.reflector.getAllAndOverride(require_plan_decorator_1.PLAN_KEY, [ctx.getHandler(), ctx.getClass()]);
        if (!requiredPlan)
            return true;
        const req = ctx.switchToHttp().getRequest();
        const userId = req.user?.id;
        if (!userId)
            return false;
        const sub = await this.subs.findOne({ where: { userId } });
        const currentPlan = (sub?.status === 'active' || sub?.status === 'trialing')
            ? sub.plan
            : 'free';
        if (PLAN_ORDER[currentPlan] >= PLAN_ORDER[requiredPlan])
            return true;
        throw new common_1.ForbiddenException({
            message: `Esta funcionalidade requer o plano ${requiredPlan} ou superior.`,
            requiredPlan,
            currentPlan,
            upgradeUrl: '/planos',
        });
    }
};
exports.PlanGuard = PlanGuard;
exports.PlanGuard = PlanGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(subscription_entity_1.Subscription)),
    __metadata("design:paramtypes", [core_1.Reflector,
        typeorm_2.Repository])
], PlanGuard);
//# sourceMappingURL=plan.guard.js.map