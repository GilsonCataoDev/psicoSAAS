import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm'

export class CreateBillingSubscriptionsTable1714500001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

    await queryRunner.createTable(
      new Table({
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
      }),
      true,
    )

    await queryRunner.createForeignKey(
      'billing_subscriptions',
      new TableForeignKey({
        name: 'FK_billing_subscriptions_userId_users_id',
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    )

    await queryRunner.createIndex(
      'billing_subscriptions',
      new TableIndex({
        name: 'IDX_billing_subscriptions_userId',
        columnNames: ['userId'],
      }),
    )

    await queryRunner.query(
      'CREATE UNIQUE INDEX "UQ_billing_subscriptions_active_user" ON "billing_subscriptions" ("userId") WHERE "status" = \'active\'',
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "UQ_billing_subscriptions_active_user"')
    await queryRunner.dropIndex('billing_subscriptions', 'IDX_billing_subscriptions_userId')
    await queryRunner.dropForeignKey(
      'billing_subscriptions',
      'FK_billing_subscriptions_userId_users_id',
    )
    await queryRunner.dropTable('billing_subscriptions')
  }
}
