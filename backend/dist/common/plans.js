"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAN_LIMITS = void 0;
exports.normalizePlan = normalizePlan;
exports.PLAN_LIMITS = {
    free: { maxPatients: 10, maxDocuments: 0 },
    basic: { maxPatients: 50, maxDocuments: 200 },
    essencial: { maxPatients: 50, maxDocuments: 200 },
    pro: { maxPatients: -1, maxDocuments: -1 },
    premium: { maxPatients: -1, maxDocuments: -1 },
};
function normalizePlan(plan) {
    return plan && plan in exports.PLAN_LIMITS ? plan : 'free';
}
//# sourceMappingURL=plans.js.map