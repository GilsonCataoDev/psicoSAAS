import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateInstrumentAssignments1714500014000 implements MigrationInterface {
  name = 'CreateInstrumentAssignments1714500014000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "instrument_assignments" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "token" character varying NOT NULL UNIQUE,
        "instrumentId" character varying NOT NULL,
        "title" character varying NOT NULL,
        "description" character varying,
        "category" character varying NOT NULL,
        "template" text NOT NULL,
        "status" text NOT NULL DEFAULT 'pending',
        "expiresAt" timestamptz NOT NULL,
        "completedAt" timestamptz,
        "responseText" text,
        "patientId" uuid NOT NULL,
        "psychologistId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_instrument_assignments_patient" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_instrument_assignments_psychologist" FOREIGN KEY ("psychologistId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `)
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_instrument_assignments_patient" ON "instrument_assignments" ("patientId")')
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_instrument_assignments_psychologist" ON "instrument_assignments" ("psychologistId")')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "instrument_assignments"')
  }
}
