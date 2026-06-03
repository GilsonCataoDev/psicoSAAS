import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAppointmentReminderTracking1714500013000 implements MigrationInterface {
  name = 'AddAppointmentReminderTracking1714500013000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "reminder24hSentAt" timestamptz')
    await queryRunner.query('ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "reminder2hSentAt" timestamptz')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "appointments" DROP COLUMN IF EXISTS "reminder2hSentAt"')
    await queryRunner.query('ALTER TABLE "appointments" DROP COLUMN IF EXISTS "reminder24hSentAt"')
  }
}
