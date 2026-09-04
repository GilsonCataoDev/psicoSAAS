import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddReminderPrefsToPatients1785410000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "reminderPrefs" jsonb`)
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE "patients" DROP COLUMN IF EXISTS "reminderPrefs"`)
  }
}
