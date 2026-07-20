import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateNeuropsychAssessments1784550000000 implements MigrationInterface {
  name = 'CreateNeuropsychAssessments1784550000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "careMode" text NOT NULL DEFAULT 'psychotherapy'`)
    await queryRunner.query(`ALTER TABLE "patients" ADD CONSTRAINT "CHK_patients_care_mode" CHECK ("careMode" IN ('psychotherapy', 'neuropsychological_assessment'))`)
    await queryRunner.query(`
      CREATE TABLE "neuropsych_assessments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "psychologistId" uuid NOT NULL,
        "patientId" uuid NOT NULL,
        "status" text NOT NULL DEFAULT 'planning',
        "referralQuestion" text,
        "clinicalHistory" text,
        "clinicalHypotheses" text,
        "qualitativeObservations" text,
        "integrationDraft" text,
        "professionalConclusion" text,
        "evaluatedDomains" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "startedAt" date NOT NULL,
        "targetCompletionDate" date,
        "completedAt" timestamptz,
        "version" integer NOT NULL DEFAULT 1,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_neuropsych_assessments" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_neuropsych_assessments_status" CHECK ("status" IN ('planning','in_progress','integration','completed','archived')),
        CONSTRAINT "FK_neuropsych_assessments_psychologist" FOREIGN KEY ("psychologistId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_neuropsych_assessments_patient" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE
      )
    `)
    await queryRunner.query(`CREATE INDEX "IDX_neuropsych_assessments_owner_status" ON "neuropsych_assessments" ("psychologistId", "status")`)
    await queryRunner.query(`CREATE INDEX "IDX_neuropsych_assessments_patient_created" ON "neuropsych_assessments" ("patientId", "createdAt")`)
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_neuropsych_assessments_active_patient" ON "neuropsych_assessments" ("psychologistId", "patientId") WHERE "status" IN ('planning','in_progress','integration')`)
    await queryRunner.query(`ALTER TABLE "patient_attachments" ADD COLUMN IF NOT EXISTS "kind" text NOT NULL DEFAULT 'other'`)
    await queryRunner.query(`ALTER TABLE "patient_attachments" ADD COLUMN IF NOT EXISTS "assessmentId" uuid`)
    await queryRunner.query(`ALTER TABLE "patient_attachments" ADD CONSTRAINT "CHK_patient_attachments_kind" CHECK ("kind" IN ('test_result','final_report','supporting_document','other'))`)
    await queryRunner.query(`ALTER TABLE "patient_attachments" ADD CONSTRAINT "FK_patient_attachments_assessment" FOREIGN KEY ("assessmentId") REFERENCES "neuropsych_assessments"("id") ON DELETE SET NULL`)
    await queryRunner.query(`CREATE INDEX "IDX_patient_attachments_assessment" ON "patient_attachments" ("assessmentId", "psychologistId") WHERE "assessmentId" IS NOT NULL`)

    await queryRunner.query(`
      CREATE TABLE "neuropsych_battery_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "assessmentId" uuid NOT NULL,
        "patientId" uuid NOT NULL,
        "psychologistId" uuid NOT NULL,
        "name" varchar(160) NOT NULL,
        "procedureType" text NOT NULL,
        "domains" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "status" text NOT NULL DEFAULT 'planned',
        "purpose" text,
        "resultSummary" text,
        "qualitativeNotes" text,
        "plannedDate" date,
        "appliedDate" date,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "instrumentAssignmentId" uuid,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_neuropsych_battery_items" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_neuropsych_battery_items_status" CHECK ("status" IN ('planned','applied','integrated','not_applied')),
        CONSTRAINT "CHK_neuropsych_battery_items_type" CHECK ("procedureType" IN ('psychological_test','neuropsychological_procedure','behavioral_scale','clinical_interview','observation','other')),
        CONSTRAINT "FK_neuropsych_battery_items_assessment" FOREIGN KEY ("assessmentId") REFERENCES "neuropsych_assessments"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_neuropsych_battery_items_patient" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_neuropsych_battery_items_psychologist" FOREIGN KEY ("psychologistId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_neuropsych_battery_items_instrument" FOREIGN KEY ("instrumentAssignmentId") REFERENCES "instrument_assignments"("id") ON DELETE SET NULL
      )
    `)
    await queryRunner.query(`CREATE INDEX "IDX_neuropsych_battery_items_assessment" ON "neuropsych_battery_items" ("assessmentId", "psychologistId", "sortOrder")`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_patient_attachments_assessment"')
    await queryRunner.query('ALTER TABLE "patient_attachments" DROP CONSTRAINT IF EXISTS "FK_patient_attachments_assessment"')
    await queryRunner.query('ALTER TABLE "patient_attachments" DROP CONSTRAINT IF EXISTS "CHK_patient_attachments_kind"')
    await queryRunner.query('ALTER TABLE "patient_attachments" DROP COLUMN IF EXISTS "assessmentId"')
    await queryRunner.query('ALTER TABLE "patient_attachments" DROP COLUMN IF EXISTS "kind"')
    await queryRunner.query('DROP TABLE IF EXISTS "neuropsych_battery_items"')
    await queryRunner.query('DROP TABLE IF EXISTS "neuropsych_assessments"')
    await queryRunner.query('ALTER TABLE "patients" DROP CONSTRAINT IF EXISTS "CHK_patients_care_mode"')
    await queryRunner.query('ALTER TABLE "patients" DROP COLUMN IF EXISTS "careMode"')
  }
}
