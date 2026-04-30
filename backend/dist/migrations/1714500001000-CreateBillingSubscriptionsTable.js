"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateBillingSubscriptionsTable1714500001000 = void 0;
const typeorm_1 = require("typeorm");
class CreateBillingSubscriptionsTable1714500001000 {
    async up(queryRunner) {
        await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'billing_subscriptions',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    generationStrategy: 'uuid',
                    default: 'uuid_generate_v4()',
                },
                {
                    name: 'userId',
                    type: 'uuid',
                    isNullable: false,
                },
                {
                    name: 'plan',
                    type: 'varchar',
                    isNullable: false,
                },
                {
                    name: 'status',
                    type: 'varchar',
                    isNullable: false,
                },
                {
                    name: 'gatewayCustomerId',
                    type: 'varchar',
                    isNullable: true,
                },
                {
                    name: 'gatewaySubscriptionId',
                    type: 'varchar',
                    isNullable: true,
                },
                {
                    name: 'currentPeriodEnd',
                    type: 'timestamptz',
                    isNullable: true,
                },
                {
                    name: 'createdAt',
                    type: 'timestamptz',
                    isNullable: false,
                    default: 'now()',
                },
            ],
        }), true);
        await queryRunner.createForeignKey('billing_subscriptions', new typeorm_1.TableForeignKey({
            name: 'FK_billing_subscriptions_userId_users_id',
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
        }));
        await queryRunner.createIndex('billing_subscriptions', new typeorm_1.TableIndex({
            name: 'IDX_billing_subscriptions_userId',
            columnNames: ['userId'],
        }));
        await queryRunner.query('CREATE UNIQUE INDEX "UQ_billing_subscriptions_active_user" ON "billing_subscriptions" ("userId") WHERE "status" = \'active\'');
    }
    async down(queryRunner) {
        await queryRunner.query('DROP INDEX "UQ_billing_subscriptions_active_user"');
        await queryRunner.dropIndex('billing_subscriptions', 'IDX_billing_subscriptions_userId');
        await queryRunner.dropForeignKey('billing_subscriptions', 'FK_billing_subscriptions_userId_users_id');
        await queryRunner.dropTable('billing_subscriptions');
    }
}
exports.CreateBillingSubscriptionsTable1714500001000 = CreateBillingSubscriptionsTable1714500001000;
//# sourceMappingURL=1714500001000-CreateBillingSubscriptionsTable.js.map