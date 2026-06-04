import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddBookingCancellationCode1714500016000 implements MigrationInterface {
  name = 'AddBookingCancellationCode1714500016000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "cancellationCode" character varying')
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS "IDX_bookings_cancellation_code" ON "bookings" ("cancellationCode")')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_bookings_cancellation_code"')
    await queryRunner.query('ALTER TABLE "bookings" DROP COLUMN IF EXISTS "cancellationCode"')
  }
}
