"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateBillingWebhookEventsTable1714500002000 = void 0;
const typeorm_1 = require("typeorm");
class CreateBillingWebhookEventsTable1714500002000 {
    async up(queryRunner) {
        await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'billing_webhook_events',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    generationStrategy: 'uuid',
                    default: 'uuid_generate_v4()',
                },
                {
                    name: 'eventId',
                    type: 'varchar',
                    isUnique: true,
                    isNullable: false,
                },
                {
                    name: 'eventType',
                    type: 'varchar',
                    isNullable: false,
                },
                {
                    name: 'payload',
                    type: 'jsonb',
                    isNullable: false,
                },
                {
                    name: 'processedAt',
                    type: 'timestamptz',
                    isNullable: false,
                    default: 'now()',
                },
            ],
        }), true);
    }
    async down(queryRunner) {
        await queryRunner.dropTable('billing_webhook_events');
    }
}
exports.CreateBillingWebhookEventsTable1714500002000 = CreateBillingWebhookEventsTable1714500002000;
//# sourceMappingURL=1714500002000-CreateBillingWebhookEventsTable.js.map