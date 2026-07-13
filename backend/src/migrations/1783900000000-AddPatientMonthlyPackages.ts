import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddPatientMonthlyPackages1783900000000 implements MigrationInterface {
  name = 'AddPatientMonthlyPackages1783900000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "billingType" text NOT NULL DEFAULT 'per_session'`)
    await queryRunner.query(`ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "monthlyPackagePrice" numeric(10,2) NOT NULL DEFAULT 0`)
    await queryRunner.query(`ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "monthlyIncludedSessions" integer NOT NULL DEFAULT 4`)
    await queryRunner.query(`ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "billingDay" integer NOT NULL DEFAULT 5`)
    await queryRunner.query(`ALTER TABLE "financial_records" ADD COLUMN IF NOT EXISTS "packageMonth" varchar(7)`)
    await queryRunner.query(`
      ALTER TABLE "patients"
      ADD CONSTRAINT "CHK_patients_billing_type"
      CHECK ("billingType" IN ('per_session', 'monthly_package'))
    `)
    await queryRunner.query(`
      ALTER TABLE "patients"
      ADD CONSTRAINT "CHK_patients_monthly_included_sessions"
      CHECK ("monthlyIncludedSessions" BETWEEN 1 AND 31)
    `)
    await queryRunner.query(`
      ALTER TABLE "patients"
      ADD CONSTRAINT "CHK_patients_billing_day"
      CHECK ("billingDay" BETWEEN 1 AND 31)
    `)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_financial_records_patient_package_month"
      ON "financial_records" ("psychologistId", "patientId", "packageMonth")
      WHERE "packageMonth" IS NOT NULL
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "UQ_financial_records_patient_package_month"')
    await queryRunner.query('ALTER TABLE "patients" DROP CONSTRAINT IF EXISTS "CHK_patients_billing_day"')
    await queryRunner.query('ALTER TABLE "patients" DROP CONSTRAINT IF EXISTS "CHK_patients_monthly_included_sessions"')
    await queryRunner.query('ALTER TABLE "patients" DROP CONSTRAINT IF EXISTS "CHK_patients_billing_type"')
    await queryRunner.query('ALTER TABLE "financial_records" DROP COLUMN IF EXISTS "packageMonth"')
    await queryRunner.query('ALTER TABLE "patients" DROP COLUMN IF EXISTS "billingDay"')
    await queryRunner.query('ALTER TABLE "patients" DROP COLUMN IF EXISTS "monthlyIncludedSessions"')
    await queryRunner.query('ALTER TABLE "patients" DROP COLUMN IF EXISTS "monthlyPackagePrice"')
    await queryRunner.query('ALTER TABLE "patients" DROP COLUMN IF EXISTS "billingType"')
  }
}
