import { MigrationInterface, QueryRunner } from 'typeorm'

export class NormalizeFinancialLinks1782600000000 implements MigrationInterface {
  name = 'NormalizeFinancialLinks1782600000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "financial_records"
      ADD COLUMN IF NOT EXISTS "appointmentId" character varying,
      ADD COLUMN IF NOT EXISTS "bookingId" character varying
    `)

    await queryRunner.query(`
      UPDATE "financial_records" fr
      SET "appointmentId" = fr."sessionId"
      FROM "appointments" a
      WHERE fr."appointmentId" IS NULL
        AND fr."sessionId" IS NOT NULL
        AND fr."sessionId"::text = a."id"::text
        AND fr."psychologistId"::text = a."psychologistId"::text
    `)

    await queryRunner.query(`
      UPDATE "financial_records" fr
      SET "bookingId" = b."id"::text
      FROM "bookings" b
      WHERE fr."bookingId" IS NULL
        AND fr."appointmentId" IS NOT NULL
        AND fr."appointmentId"::text = b."appointmentId"::text
        AND fr."psychologistId"::text = b."psychologistId"::text
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_financial_records_psychologist_status_due"
      ON "financial_records" ("psychologistId", "status", "dueDate")
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_financial_records_patient_due"
      ON "financial_records" ("patientId", "dueDate")
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_financial_records_session"
      ON "financial_records" ("sessionId")
      WHERE "sessionId" IS NOT NULL
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_financial_records_appointment"
      ON "financial_records" ("appointmentId")
      WHERE "appointmentId" IS NOT NULL
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_financial_records_booking"
      ON "financial_records" ("bookingId")
      WHERE "bookingId" IS NOT NULL
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_appointments_psychologist_date_status"
      ON "appointments" ("psychologistId", "date", "status")
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_appointments_patient_date"
      ON "appointments" ("patientId", "date")
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_bookings_psychologist_date_status"
      ON "bookings" ("psychologistId", "date", "status")
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_bookings_appointment"
      ON "bookings" ("appointmentId")
      WHERE "appointmentId" IS NOT NULL
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sessions_appointment"
      ON "sessions" ("appointmentId")
      WHERE "appointmentId" IS NOT NULL
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_availability_slots_lookup"
      ON "availability_slots" ("psychologistId", "weekday", "modality", "isActive")
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_blocked_dates_lookup"
      ON "blocked_dates" ("psychologistId", "date")
    `)

    await queryRunner.query(`
      ALTER TABLE "financial_records"
      ADD CONSTRAINT "CHK_financial_records_type"
      CHECK ("type" IN ('income', 'expense')) NOT VALID
    `)
    await queryRunner.query(`
      ALTER TABLE "financial_records"
      ADD CONSTRAINT "CHK_financial_records_status"
      CHECK ("status" IN ('paid', 'pending', 'overdue')) NOT VALID
    `)
    await queryRunner.query(`
      ALTER TABLE "financial_records"
      ADD CONSTRAINT "CHK_financial_records_method"
      CHECK (
        "method" IS NULL
        OR "method" IN ('pix', 'credit_card', 'debit_card', 'cash', 'transfer', 'manual')
      ) NOT VALID
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "financial_records" DROP CONSTRAINT IF EXISTS "CHK_financial_records_method"')
    await queryRunner.query('ALTER TABLE "financial_records" DROP CONSTRAINT IF EXISTS "CHK_financial_records_status"')
    await queryRunner.query('ALTER TABLE "financial_records" DROP CONSTRAINT IF EXISTS "CHK_financial_records_type"')
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_financial_records_booking"')
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_blocked_dates_lookup"')
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_availability_slots_lookup"')
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_sessions_appointment"')
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_bookings_appointment"')
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_bookings_psychologist_date_status"')
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_appointments_patient_date"')
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_appointments_psychologist_date_status"')
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_financial_records_appointment"')
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_financial_records_session"')
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_financial_records_patient_due"')
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_financial_records_psychologist_status_due"')
    await queryRunner.query(`
      ALTER TABLE "financial_records"
      DROP COLUMN IF EXISTS "bookingId",
      DROP COLUMN IF EXISTS "appointmentId"
    `)
  }
}
