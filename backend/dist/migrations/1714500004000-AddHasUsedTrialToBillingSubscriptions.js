"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddHasUsedTrialToBillingSubscriptions1714500004000 = void 0;
const typeorm_1 = require("typeorm");
class AddHasUsedTrialToBillingSubscriptions1714500004000 {
    async up(queryRunner) {
        await queryRunner.addColumn('billing_subscriptions', new typeorm_1.TableColumn({
            name: 'hasUsedTrial',
            type: 'boolean',
            isNullable: false,
            default: false,
        }));
        await queryRunner.query('UPDATE "billing_subscriptions" SET "hasUsedTrial" = true WHERE "trialEndsAt" IS NOT NULL');
    }
    async down(queryRunner) {
        await queryRunner.dropColumn('billing_subscriptions', 'hasUsedTrial');
    }
}
exports.AddHasUsedTrialToBillingSubscriptions1714500004000 = AddHasUsedTrialToBillingSubscriptions1714500004000;
//# sourceMappingURL=1714500004000-AddHasUsedTrialToBillingSubscriptions.js.map