import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateNeuropsychAiAnalyses1784560000000 implements MigrationInterface {
  name = 'CreateNeuropsychAiAnalyses1784560000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "ai_usage" ADD COLUMN IF NOT EXISTS "neuropsychAnalyses" integer NOT NULL DEFAULT 0`)

    await queryRunner.query(`
      CREATE TABLE "neuropsych_ai_analyses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "psychologistId" uuid NOT NULL,
        "patientId" uuid NOT NULL,
        "assessmentId" uuid NOT NULL,
        "status" text NOT NULL DEFAULT 'completed',
        "response" text NOT NULL,
        "promptVersion" text NOT NULL,
        "model" text NOT NULL,
        "inputTokens" integer NOT NULL DEFAULT 0,
        "outputTokens" integer NOT NULL DEFAULT 0,
        "costUsdMicros" integer NOT NULL DEFAULT 0,
        "includedFields" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_neuropsych_ai_analyses" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_neuropsych_ai_analyses_status" CHECK ("status" IN ('completed')),
        CONSTRAINT "FK_neuropsych_ai_analyses_psychologist" FOREIGN KEY ("psychologistId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_neuropsych_ai_analyses_patient" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_neuropsych_ai_analyses_assessment" FOREIGN KEY ("assessmentId") REFERENCES "neuropsych_assessments"("id") ON DELETE CASCADE
      )
    `)
    await queryRunner.query(`CREATE INDEX "IDX_neuropsych_ai_analyses_assessment" ON "neuropsych_ai_analyses" ("assessmentId", "psychologistId", "createdAt")`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_neuropsych_ai_analyses_assessment"')
    await queryRunner.query('DROP TABLE IF EXISTS "neuropsych_ai_analyses"')
    await queryRunner.query('ALTER TABLE "ai_usage" DROP COLUMN IF EXISTS "neuropsychAnalyses"')
  }
}
