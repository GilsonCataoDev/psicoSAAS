import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Tokens de push nativo (Firebase Cloud Messaging) para o app Android/iOS —
 * paralelo ao push web (push_subscriptions), mas guarda um token FCM em vez
 * de endpoint/chaves VAPID. Ver NativePushTokenEntity.
 */
export class CreateNativePushTokens1785220000000 implements MigrationInterface {
  name = 'CreateNativePushTokens1785220000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "native_push_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "token" text NOT NULL,
        "platform" varchar(10) NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_native_push_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "FK_native_push_tokens_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `)
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS "UQ_native_push_tokens_user_token" ON "native_push_tokens" ("userId", "token")')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "native_push_tokens"')
  }
}
