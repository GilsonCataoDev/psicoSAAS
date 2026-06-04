import { MigrationInterface, QueryRunner } from 'typeorm'

export class AllowSameDayBookings1714500015000 implements MigrationInterface {
  name = 'AllowSameDayBookings1714500015000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "booking_pages" ALTER COLUMN "minAdvanceDays" SET DEFAULT 0')
    await queryRunner.query('UPDATE "booking_pages" SET "minAdvanceDays" = 0 WHERE "minAdvanceDays" = 1')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "booking_pages" ALTER COLUMN "minAdvanceDays" SET DEFAULT 1')
  }
}
