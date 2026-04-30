import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm'

export class AddHasUsedTrialToBillingSubscriptions1714500004000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'billing_subscriptions',
      new TableColumn({
        name: 'hasUsedTrial',
        type: 'boolean',
        isNullable: false,
        default: false,
      }),
    )

    await queryRunner.query(
      'UPDATE "billing_subscriptions" SET "hasUsedTrial" = true WHERE "trialEndsAt" IS NOT NULL',
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('billing_subscriptions', 'hasUsedTrial')
  }
}
