import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm'

export class AddCancelAtPeriodEndToBillingSubscriptions1714500005000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'billing_subscriptions',
      new TableColumn({
        name: 'cancelAtPeriodEnd',
        type: 'boolean',
        isNullable: false,
        default: false,
      }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('billing_subscriptions', 'cancelAtPeriodEnd')
  }
}
