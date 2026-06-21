import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddLastActiveAtToUsers1750000004000 implements MigrationInterface {
  name = 'AddLastActiveAtToUsers1750000004000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMP WITH TIME ZONE
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_lastActiveAt"
      ON "users" ("lastActiveAt" DESC NULLS LAST)
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_users_lastActiveAt"')
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "lastActiveAt"')
  }
}
