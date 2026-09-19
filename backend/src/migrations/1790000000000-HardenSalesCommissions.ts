import { MigrationInterface, QueryRunner } from 'typeorm'

export class HardenSalesCommissions1790000000000 implements MigrationInterface {
  name = 'HardenSalesCommissions1790000000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "billing_webhook_events"
      ADD COLUMN IF NOT EXISTS "paymentId" character varying(200)
    `)
    await queryRunner.query(`
      UPDATE "billing_webhook_events"
      SET "paymentId" = NULLIF("payload"->>'paymentId', '')
      WHERE "paymentId" IS NULL
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_billing_webhook_events_payment_event"
      ON "billing_webhook_events" ("paymentId", "eventType")
    `)

    await queryRunner.query(`
      ALTER TABLE "sales_commissions"
      DROP CONSTRAINT IF EXISTS "CK_sales_commissions_status"
    `)
    await queryRunner.query(`
      ALTER TABLE "sales_commissions"
      ADD CONSTRAINT "CK_sales_commissions_status"
      CHECK ("status" IN ('pending','validating','payable','paid','refunded','chargeback','clawback'))
    `)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_sales_commissions_userId"
      ON "sales_commissions" ("userId")
      WHERE "userId" IS NOT NULL
    `)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_sales_commissions_paymentId"
      ON "sales_commissions" ("paymentId")
      WHERE "paymentId" IS NOT NULL
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_sales_commissions_paymentId"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_sales_commissions_userId"`)
    await queryRunner.query(`
      ALTER TABLE "sales_commissions"
      DROP CONSTRAINT IF EXISTS "CK_sales_commissions_status"
    `)
    await queryRunner.query(`
      ALTER TABLE "sales_commissions"
      ADD CONSTRAINT "CK_sales_commissions_status"
      CHECK ("status" IN ('pending','validating','payable','paid','refunded','chargeback'))
    `)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_billing_webhook_events_payment_event"`)
    await queryRunner.query(`ALTER TABLE "billing_webhook_events" DROP COLUMN IF EXISTS "paymentId"`)
  }
}
