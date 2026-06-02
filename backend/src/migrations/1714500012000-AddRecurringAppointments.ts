import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddRecurringAppointments1714500012000 implements MigrationInterface {
  name = 'AddRecurringAppointments1714500012000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "hasFixedSchedule" boolean NOT NULL DEFAULT false')
    await queryRunner.query('ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "fixedScheduleWeekday" integer')
    await queryRunner.query('ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "fixedScheduleTime" character varying')
    await queryRunner.query('ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "fixedScheduleFrequency" text NOT NULL DEFAULT \'weekly\'')
    await queryRunner.query('ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "fixedScheduleModality" text NOT NULL DEFAULT \'presencial\'')

    await queryRunner.query('ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "isRecurring" boolean NOT NULL DEFAULT false')
    await queryRunner.query('ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "recurringFrequency" character varying')
    await queryRunner.query('ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "recurringGroupId" character varying')
    await queryRunner.query('ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "isFixedScheduleException" boolean NOT NULL DEFAULT false')
    await queryRunner.query('ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "originalDate" character varying')
    await queryRunner.query('ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "originalTime" character varying')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "appointments" DROP COLUMN IF EXISTS "originalTime"')
    await queryRunner.query('ALTER TABLE "appointments" DROP COLUMN IF EXISTS "originalDate"')
    await queryRunner.query('ALTER TABLE "appointments" DROP COLUMN IF EXISTS "isFixedScheduleException"')
    await queryRunner.query('ALTER TABLE "appointments" DROP COLUMN IF EXISTS "recurringGroupId"')
    await queryRunner.query('ALTER TABLE "appointments" DROP COLUMN IF EXISTS "recurringFrequency"')
    await queryRunner.query('ALTER TABLE "appointments" DROP COLUMN IF EXISTS "isRecurring"')

    await queryRunner.query('ALTER TABLE "patients" DROP COLUMN IF EXISTS "fixedScheduleModality"')
    await queryRunner.query('ALTER TABLE "patients" DROP COLUMN IF EXISTS "fixedScheduleFrequency"')
    await queryRunner.query('ALTER TABLE "patients" DROP COLUMN IF EXISTS "fixedScheduleTime"')
    await queryRunner.query('ALTER TABLE "patients" DROP COLUMN IF EXISTS "fixedScheduleWeekday"')
    await queryRunner.query('ALTER TABLE "patients" DROP COLUMN IF EXISTS "hasFixedSchedule"')
  }
}
