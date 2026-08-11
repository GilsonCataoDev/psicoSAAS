import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddWhatsAppDeliveryUnknownStatus1785310000000 implements MigrationInterface {
  name = 'AddWhatsAppDeliveryUnknownStatus1785310000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "whatsapp_outbox" DROP CONSTRAINT "CHK_whatsapp_outbox_status"')
    await queryRunner.query(`
      ALTER TABLE "whatsapp_outbox"
      ADD CONSTRAINT "CHK_whatsapp_outbox_status"
      CHECK ("status" IN ('pending','sending','delivery_unknown','accepted','delivered','read','failed'))
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "whatsapp_outbox"
      SET "status" = 'failed', "providerStatus" = 'delivery_unknown_rollback'
      WHERE "status" = 'delivery_unknown'
    `)
    await queryRunner.query('ALTER TABLE "whatsapp_outbox" DROP CONSTRAINT "CHK_whatsapp_outbox_status"')
    await queryRunner.query(`
      ALTER TABLE "whatsapp_outbox"
      ADD CONSTRAINT "CHK_whatsapp_outbox_status"
      CHECK ("status" IN ('pending','sending','accepted','delivered','read','failed'))
    `)
  }
}
