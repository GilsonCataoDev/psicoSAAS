import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreatePatientAttachments1782599000000 implements MigrationInterface {
  name = 'CreatePatientAttachments1782599000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "patient_attachments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "filename" character varying NOT NULL,
        "mimeType" character varying NOT NULL,
        "size" integer NOT NULL,
        "data" text NOT NULL,
        "patientId" uuid NOT NULL,
        "psychologistId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_patient_attachments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_patient_attachments_patientId" FOREIGN KEY ("patientId")
          REFERENCES "patients"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_patient_attachments_psychologistId" FOREIGN KEY ("psychologistId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_patient_attachments_patient"
      ON "patient_attachments" ("patientId", "psychologistId")
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_patient_attachments_patient"')
    await queryRunner.query('DROP TABLE IF EXISTS "patient_attachments"')
  }
}
