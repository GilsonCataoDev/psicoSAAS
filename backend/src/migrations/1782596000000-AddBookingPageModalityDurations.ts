import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddBookingPageModalityDurations1782596000000 implements MigrationInterface {
  name = 'AddBookingPageModalityDurations1782596000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "booking_pages" ADD COLUMN IF NOT EXISTS "presencialSessionDuration" integer NOT NULL DEFAULT 50`)
    await queryRunner.query(`ALTER TABLE "booking_pages" ADD COLUMN IF NOT EXISTS "onlineSessionDuration" integer NOT NULL DEFAULT 50`)
    await queryRunner.query(`
      UPDATE "booking_pages"
      SET
        "presencialSessionDuration" = COALESCE(NULLIF("sessionDuration", 0), 50),
        "onlineSessionDuration" = COALESCE(NULLIF("sessionDuration", 0), 50)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "booking_pages" DROP COLUMN IF EXISTS "onlineSessionDuration"`)
    await queryRunner.query(`ALTER TABLE "booking_pages" DROP COLUMN IF EXISTS "presencialSessionDuration"`)
  }
}
