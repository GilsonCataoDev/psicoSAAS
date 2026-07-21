import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddNextMonthBookingPermission1784580000000 implements MigrationInterface {
  name = 'AddNextMonthBookingPermission1784580000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "booking_pages" ADD COLUMN IF NOT EXISTS "allowNextMonthBooking" boolean NOT NULL DEFAULT false`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "booking_pages" DROP COLUMN IF EXISTS "allowNextMonthBooking"`)
  }
}
