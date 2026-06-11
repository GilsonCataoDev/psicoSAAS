import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreatePushSubscriptions1714500023000 implements MigrationInterface {
  name = 'CreatePushSubscriptions1714500023000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "push_subscriptions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "endpoint" text NOT NULL,
        "p256dh" text NOT NULL,
        "auth" text NOT NULL,
        "userAgent" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_push_subscriptions_user_endpoint"
      ON "push_subscriptions" ("userId", "endpoint")
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_push_subscriptions_user"
      ON "push_subscriptions" ("userId")
    `)
    await queryRunner.query(`
      ALTER TABLE "push_subscriptions"
      ADD CONSTRAINT "FK_push_subscriptions_user"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "push_subscriptions" DROP CONSTRAINT IF EXISTS "FK_push_subscriptions_user"')
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_push_subscriptions_user"')
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_push_subscriptions_user_endpoint"')
    await queryRunner.query('DROP TABLE IF EXISTS "push_subscriptions"')
  }
}
