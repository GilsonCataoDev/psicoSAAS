import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddBillingPromotions1782601000000 implements MigrationInterface {
  name = 'AddBillingPromotions1782601000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "billing_subscriptions" ADD COLUMN IF NOT EXISTS "promoCode" character varying')
    await queryRunner.query('ALTER TABLE "billing_subscriptions" ADD COLUMN IF NOT EXISTS "promoDiscountPercent" integer NOT NULL DEFAULT 0')
    await queryRunner.query('ALTER TABLE "billing_subscriptions" ADD COLUMN IF NOT EXISTS "promoCyclesTotal" integer NOT NULL DEFAULT 0')
    await queryRunner.query('ALTER TABLE "billing_subscriptions" ADD COLUMN IF NOT EXISTS "promoCyclesUsed" integer NOT NULL DEFAULT 0')
    await queryRunner.query('ALTER TABLE "billing_subscriptions" ADD COLUMN IF NOT EXISTS "regularMonthlyValue" numeric(10,2)')
    await queryRunner.query('ALTER TABLE "billing_subscriptions" ADD COLUMN IF NOT EXISTS "lastPromoPaymentId" character varying')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "billing_subscriptions" DROP COLUMN IF EXISTS "lastPromoPaymentId"')
    await queryRunner.query('ALTER TABLE "billing_subscriptions" DROP COLUMN IF EXISTS "regularMonthlyValue"')
    await queryRunner.query('ALTER TABLE "billing_subscriptions" DROP COLUMN IF EXISTS "promoCyclesUsed"')
    await queryRunner.query('ALTER TABLE "billing_subscriptions" DROP COLUMN IF EXISTS "promoCyclesTotal"')
    await queryRunner.query('ALTER TABLE "billing_subscriptions" DROP COLUMN IF EXISTS "promoDiscountPercent"')
    await queryRunner.query('ALTER TABLE "billing_subscriptions" DROP COLUMN IF EXISTS "promoCode"')
  }
}
