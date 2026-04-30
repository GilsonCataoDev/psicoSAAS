import {
  MigrationInterface,
  QueryRunner,
  Table,
} from 'typeorm'

export class CreateRefreshTokensTable1714500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

    const hasRefreshTokens = await queryRunner.hasTable('refresh_tokens')

    if (!hasRefreshTokens) {
      await queryRunner.createTable(
        new Table({
          name: 'refresh_tokens',
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
              name: 'tokenHash',
              type: 'varchar',
              isNullable: false,
            },
            {
              name: 'ip',
              type: 'varchar',
              isNullable: true,
            },
            {
              name: 'userAgent',
              type: 'varchar',
              isNullable: true,
            },
            {
              name: 'revoked',
              type: 'boolean',
              isNullable: false,
              default: false,
            },
            {
              name: 'expiresAt',
              type: 'timestamptz',
              isNullable: false,
            },
            {
              name: 'createdAt',
              type: 'timestamptz',
              isNullable: false,
              default: 'now()',
            },
          ],
        }),
      )
    } else {
      const table = await queryRunner.getTable('refresh_tokens')
      const userIdColumn = table?.findColumnByName('userId')

      if (userIdColumn?.type !== 'uuid') {
        await queryRunner.query(
          'ALTER TABLE "refresh_tokens" ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid',
        )
      }

      if (!table?.findColumnByName('ip')) {
        await queryRunner.query('ALTER TABLE "refresh_tokens" ADD COLUMN "ip" varchar')
      }

      if (table?.findColumnByName('ipAddress')) {
        await queryRunner.query(
          'UPDATE "refresh_tokens" SET "ip" = COALESCE("ip", "ipAddress")',
        )
      }
    }

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_refresh_tokens_userId_users_id'
        ) THEN
          ALTER TABLE "refresh_tokens"
          ADD CONSTRAINT "FK_refresh_tokens_userId_users_id"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `)

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_userId" ON "refresh_tokens" ("userId")',
    )
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_expiresAt" ON "refresh_tokens" ("expiresAt")',
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('refresh_tokens', 'IDX_refresh_tokens_expiresAt')
    await queryRunner.dropIndex('refresh_tokens', 'IDX_refresh_tokens_userId')
    await queryRunner.dropForeignKey('refresh_tokens', 'FK_refresh_tokens_userId_users_id')
    await queryRunner.dropTable('refresh_tokens')
  }
}
