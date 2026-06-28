import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddBookingPageModalityIntervals1782595000000 implements MigrationInterface {
  name = 'AddBookingPageModalityIntervals1782595000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "booking_pages" ADD COLUMN IF NOT EXISTS "presencialSlotInterval" integer NOT NULL DEFAULT 60`)
    await queryRunner.query(`ALTER TABLE "booking_pages" ADD COLUMN IF NOT EXISTS "onlineSlotInterval" integer NOT NULL DEFAULT 60`)
    await queryRunner.query(`
      UPDATE "booking_pages"
      SET
        "presencialSlotInterval" = COALESCE(NULLIF("slotInterval", 0), 60),
        "onlineSlotInterval" = COALESCE(NULLIF("slotInterval", 0), 60)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "booking_pages" DROP COLUMN IF EXISTS "onlineSlotInterval"`)
    await queryRunner.query(`ALTER TABLE "booking_pages" DROP COLUMN IF EXISTS "presencialSlotInterval"`)
  }
}
