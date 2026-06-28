import { MigrationInterface, QueryRunner } from 'typeorm'

export class ConvertBookingIntervalsToBreaks1782597000000 implements MigrationInterface {
  name = 'ConvertBookingIntervalsToBreaks1782597000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "booking_pages"
      SET
        "presencialSlotInterval" = GREATEST(
          COALESCE("presencialSlotInterval", "slotInterval", 60)
          - COALESCE("presencialSessionDuration", "sessionDuration", 50),
          0
        ),
        "onlineSlotInterval" = GREATEST(
          COALESCE("onlineSlotInterval", "slotInterval", 60)
          - COALESCE("onlineSessionDuration", "sessionDuration", 50),
          0
        )
    `)
    await queryRunner.query(`ALTER TABLE "booking_pages" ALTER COLUMN "presencialSlotInterval" SET DEFAULT 10`)
    await queryRunner.query(`ALTER TABLE "booking_pages" ALTER COLUMN "onlineSlotInterval" SET DEFAULT 0`)
    await queryRunner.query(`ALTER TABLE "booking_pages" ALTER COLUMN "slotInterval" SET DEFAULT 50`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "booking_pages"
      SET
        "presencialSlotInterval" = COALESCE("presencialSlotInterval", 10)
          + COALESCE("presencialSessionDuration", "sessionDuration", 50),
        "onlineSlotInterval" = COALESCE("onlineSlotInterval", 0)
          + COALESCE("onlineSessionDuration", "sessionDuration", 50)
    `)
    await queryRunner.query(`ALTER TABLE "booking_pages" ALTER COLUMN "presencialSlotInterval" SET DEFAULT 60`)
    await queryRunner.query(`ALTER TABLE "booking_pages" ALTER COLUMN "onlineSlotInterval" SET DEFAULT 60`)
    await queryRunner.query(`ALTER TABLE "booking_pages" ALTER COLUMN "slotInterval" SET DEFAULT 60`)
  }
}
