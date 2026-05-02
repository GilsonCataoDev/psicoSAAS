"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddCancelAtPeriodEndToBillingSubscriptions1714500005000 = void 0;
const typeorm_1 = require("typeorm");
class AddCancelAtPeriodEndToBillingSubscriptions1714500005000 {
    async up(queryRunner) {
        await queryRunner.addColumn('billing_subscriptions', new typeorm_1.TableColumn({
            name: 'cancelAtPeriodEnd',
            type: 'boolean',
            isNullable: false,
            default: false,
        }));
    }
    async down(queryRunner) {
        await queryRunner.dropColumn('billing_subscriptions', 'cancelAtPeriodEnd');
    }
}
exports.AddCancelAtPeriodEndToBillingSubscriptions1714500005000 = AddCancelAtPeriodEndToBillingSubscriptions1714500005000;
//# sourceMappingURL=1714500005000-AddCancelAtPeriodEndToBillingSubscriptions.js.map