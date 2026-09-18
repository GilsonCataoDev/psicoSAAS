import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateNutritionPlans1785460000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE IF NOT EXISTS "nutrition_plans" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "patientId" uuid NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
        "title" varchar(200) NOT NULL DEFAULT 'Plano Alimentar',
        "content" text NOT NULL,
        "totalCalories" integer,
        "validFrom" date,
        "validUntil" date,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await runner.query(
      'CREATE INDEX IF NOT EXISTS "idx_nutrition_plans_patient_user" ON "nutrition_plans" ("patientId", "userId", "createdAt" DESC)',
    )
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP TABLE IF EXISTS "nutrition_plans"')
  }
}
