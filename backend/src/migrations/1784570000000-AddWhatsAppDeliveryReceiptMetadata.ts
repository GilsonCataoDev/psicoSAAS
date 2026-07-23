import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddWhatsAppDeliveryReceiptMetadata1784570000000 implements MigrationInterface {
  name = 'AddWhatsAppDeliveryReceiptMetadata1784570000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "whatsapp_delivery_logs" ADD COLUMN IF NOT EXISTS "providerMessageId" text`)
    await queryRunner.query(`ALTER TABLE "whatsapp_delivery_logs" ADD COLUMN IF NOT EXISTS "providerStatus" text`)
    await queryRunner.query(`ALTER TABLE "whatsapp_delivery_logs" ADD COLUMN IF NOT EXISTS "contentLength" integer`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "whatsapp_delivery_logs" DROP COLUMN IF EXISTS "contentLength"`)
    await queryRunner.query(`ALTER TABLE "whatsapp_delivery_logs" DROP COLUMN IF EXISTS "providerStatus"`)
    await queryRunner.query(`ALTER TABLE "whatsapp_delivery_logs" DROP COLUMN IF EXISTS "providerMessageId"`)
  }
}
