import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddModalityToBookings1714500007000 implements MigrationInterface {
  name = 'AddModalityToBookings1714500007000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "modality" character varying NOT NULL DEFAULT \'online\'')
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "bookings" DROP COLUMN IF EXISTS "modality"')
  }
}
