import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddCancelAtPeriodEndToBillingSubscriptions1714500005000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "billing_subscriptions" ADD COLUMN IF NOT EXISTS "cancelAtPeriodEnd" boolean NOT NULL DEFAULT false',
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "billing_subscriptions" DROP COLUMN IF EXISTS "cancelAtPeriodEnd"')
  }
}
