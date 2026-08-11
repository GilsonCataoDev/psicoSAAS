import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAiGovernanceAndWhatsAppOutbox1785280000000 implements MigrationInterface {
  name = 'AddAiGovernanceAndWhatsAppOutbox1785280000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ai_consent_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "psychologistId" uuid NOT NULL,
        "scope" text NOT NULL,
        "patientId" uuid,
        "action" text NOT NULL,
        "textVersion" text NOT NULL,
        "textSnapshot" text NOT NULL,
        "source" text NOT NULL,
        "ip" text,
        "userAgent" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ai_consent_events" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_ai_consent_scope" CHECK ("scope" IN ('clinical_ai_processing','session_recording_transcription','neuropsych_ai')),
        CONSTRAINT "CHK_ai_consent_action" CHECK ("action" IN ('accepted','revoked')),
        CONSTRAINT "FK_ai_consent_user" FOREIGN KEY ("psychologistId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_ai_consent_patient" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE
      )
    `)
    await queryRunner.query('CREATE INDEX "IDX_ai_consent_lookup" ON "ai_consent_events" ("psychologistId", "scope", "patientId", "createdAt")')

    await queryRunner.query(`
      CREATE TABLE "clinical_ai_drafts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "psychologistId" uuid NOT NULL,
        "patientId" uuid NOT NULL,
        "sessionId" uuid,
        "kind" text NOT NULL,
        "content" text NOT NULL,
        "sourceHash" text NOT NULL,
        "status" text NOT NULL DEFAULT 'generated',
        "model" text NOT NULL,
        "promptVersion" text NOT NULL,
        "inputTokens" integer NOT NULL DEFAULT 0,
        "outputTokens" integer NOT NULL DEFAULT 0,
        "costUsdMicros" integer NOT NULL DEFAULT 0,
        "reviewedAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_clinical_ai_drafts" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_clinical_ai_draft_kind" CHECK ("kind" IN ('session_summary','clinical_note','session_plan')),
        CONSTRAINT "CHK_clinical_ai_draft_status" CHECK ("status" IN ('generated','accepted','discarded')),
        CONSTRAINT "FK_clinical_ai_draft_user" FOREIGN KEY ("psychologistId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_clinical_ai_draft_patient" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_clinical_ai_draft_session" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE SET NULL
      )
    `)
    await queryRunner.query('CREATE INDEX "IDX_clinical_ai_drafts_patient" ON "clinical_ai_drafts" ("psychologistId", "patientId", "createdAt")')

  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "clinical_ai_drafts"')
    await queryRunner.query('DROP TABLE IF EXISTS "ai_consent_events"')
  }
}
