import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm'

export class AddTrialEndsAtToBillingSubscriptions1714500003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'billing_subscriptions',
      new TableColumn({
        name: 'trialEndsAt',
        type: 'timestamptz',
        isNullable: true,
      }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('billing_subscriptions', 'trialEndsAt')
  }
}
