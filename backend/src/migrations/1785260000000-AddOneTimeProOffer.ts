import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddOneTimeProOffer1785260000000 implements MigrationInterface {
  name = 'AddOneTimeProOffer1785260000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "billing_subscriptions" ADD COLUMN IF NOT EXISTS "upgradeOfferViewedAt" TIMESTAMP WITH TIME ZONE',
    )
    await queryRunner.query(
      'ALTER TABLE "billing_subscriptions" ADD COLUMN IF NOT EXISTS "activationOfferRedeemedAt" TIMESTAMP WITH TIME ZONE',
    )
    await queryRunner.query(
      'ALTER TABLE "billing_subscriptions" ADD COLUMN IF NOT EXISTS "upgradeOfferEmailedAt" TIMESTAMP WITH TIME ZONE',
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "billing_subscriptions" DROP COLUMN IF EXISTS "upgradeOfferEmailedAt"',
    )
    await queryRunner.query(
      'ALTER TABLE "billing_subscriptions" DROP COLUMN IF EXISTS "activationOfferRedeemedAt"',
    )
    await queryRunner.query(
      'ALTER TABLE "billing_subscriptions" DROP COLUMN IF EXISTS "upgradeOfferViewedAt"',
    )
  }
}
