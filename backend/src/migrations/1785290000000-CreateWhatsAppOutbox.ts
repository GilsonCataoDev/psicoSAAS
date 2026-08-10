import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateWhatsAppOutbox1785290000000 implements MigrationInterface {
  name = 'CreateWhatsAppOutbox1785290000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "whatsapp_outbox" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "idempotencyKey" text NOT NULL,
        "type" text NOT NULL,
        "provider" text NOT NULL DEFAULT 'evolution',
        "status" text NOT NULL DEFAULT 'pending',
        "patientId" text,
        "recipientPhone" text NOT NULL,
        "content" text NOT NULL,
        "attempts" integer NOT NULL DEFAULT 0,
        "nextAttemptAt" timestamptz,
        "providerMessageId" text,
        "providerStatus" text,
        "lastError" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_whatsapp_outbox" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_whatsapp_outbox_idempotency" UNIQUE ("idempotencyKey"),
        CONSTRAINT "CHK_whatsapp_outbox_status" CHECK ("status" IN ('pending','sending','accepted','delivered','read','failed')),
        CONSTRAINT "FK_whatsapp_outbox_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `)
    await queryRunner.query('CREATE INDEX "IDX_whatsapp_outbox_retry" ON "whatsapp_outbox" ("status", "nextAttemptAt")')
    await queryRunner.query('CREATE INDEX "IDX_whatsapp_outbox_message" ON "whatsapp_outbox" ("providerMessageId")')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "whatsapp_outbox"')
  }
}
