import { MigrationInterface, QueryRunner } from 'typeorm'

export class LinkProspectsToUsers1785320000000 implements MigrationInterface {
  name = 'LinkProspectsToUsers1785320000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "prospects" ADD COLUMN IF NOT EXISTS "linkedUserId" uuid')
    await queryRunner.query('ALTER TABLE "prospects" ADD COLUMN IF NOT EXISTS "registeredAt" timestamptz')
    await queryRunner.query('ALTER TABLE "prospects" ADD COLUMN IF NOT EXISTS "activatedAt" timestamptz')
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_prospects_linked_user"
      ON "prospects" ("linkedUserId")
      WHERE "linkedUserId" IS NOT NULL
    `)
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "prospects"
          ADD CONSTRAINT "FK_prospects_linked_user"
          FOREIGN KEY ("linkedUserId") REFERENCES "users"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "prospects" DROP CONSTRAINT IF EXISTS "FK_prospects_linked_user"')
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_prospects_linked_user"')
    await queryRunner.query('ALTER TABLE "prospects" DROP COLUMN IF EXISTS "activatedAt"')
    await queryRunner.query('ALTER TABLE "prospects" DROP COLUMN IF EXISTS "registeredAt"')
    await queryRunner.query('ALTER TABLE "prospects" DROP COLUMN IF EXISTS "linkedUserId"')
  }
}
