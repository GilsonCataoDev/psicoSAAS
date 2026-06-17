import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateWhatsAppDeliveryLogs1714500026000 implements MigrationInterface {
  name = 'CreateWhatsAppDeliveryLogs1714500026000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "whatsapp_delivery_logs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "type" text NOT NULL,
        "status" text NOT NULL DEFAULT 'failed',
        "patientId" text,
        "patientName" text,
        "recipientPhone" text,
        "error" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_whatsapp_delivery_logs_user"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `)
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_whatsapp_delivery_logs_user_created" ON "whatsapp_delivery_logs" ("userId", "createdAt")')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_whatsapp_delivery_logs_user_created"')
    await queryRunner.query('DROP TABLE IF EXISTS "whatsapp_delivery_logs"')
  }
}
