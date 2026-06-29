import { MigrationInterface, QueryRunner } from 'typeorm'

export class AllowBookingWithoutEmail1782598000000 implements MigrationInterface {
  name = 'AllowBookingWithoutEmail1782598000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bookings" ALTER COLUMN "patientEmail" DROP NOT NULL`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "bookings" SET "patientEmail" = '' WHERE "patientEmail" IS NULL`)
    await queryRunner.query(`ALTER TABLE "bookings" ALTER COLUMN "patientEmail" SET NOT NULL`)
  }
}
