"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddTrialEndsAtToBillingSubscriptions1714500003000 = void 0;
const typeorm_1 = require("typeorm");
class AddTrialEndsAtToBillingSubscriptions1714500003000 {
    async up(queryRunner) {
        await queryRunner.addColumn('billing_subscriptions', new typeorm_1.TableColumn({
            name: 'trialEndsAt',
            type: 'timestamptz',
            isNullable: true,
        }));
    }
    async down(queryRunner) {
        await queryRunner.dropColumn('billing_subscriptions', 'trialEndsAt');
    }
}
exports.AddTrialEndsAtToBillingSubscriptions1714500003000 = AddTrialEndsAtToBillingSubscriptions1714500003000;
//# sourceMappingURL=1714500003000-AddTrialEndsAtToBillingSubscriptions.js.map