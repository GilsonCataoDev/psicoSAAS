import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateNutritionAssessments1785430000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE IF NOT EXISTS "nutrition_assessments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "psychologistId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "patientId" uuid NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
        "assessedAt" date NOT NULL,
        "weightKg" text NOT NULL,
        "heightCm" text,
        "waistCm" text,
        "bodyFatPercent" text,
        "notes" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await runner.query('CREATE INDEX IF NOT EXISTS "idx_nutrition_assessments_patient_date" ON "nutrition_assessments" ("patientId", "psychologistId", "assessedAt")')
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP TABLE IF EXISTS "nutrition_assessments"')
  }
}
