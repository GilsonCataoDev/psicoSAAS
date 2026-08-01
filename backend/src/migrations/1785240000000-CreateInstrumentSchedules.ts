import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateInstrumentSchedules1785240000000 implements MigrationInterface {
  name = 'CreateInstrumentSchedules1785240000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "instrument_schedules" (
        "id"                uuid        NOT NULL DEFAULT uuid_generate_v4(),
        "instrumentId"      varchar     NOT NULL,
        "title"             varchar     NOT NULL,
        "description"       varchar,
        "category"          varchar     NOT NULL,
        "template"          text        NOT NULL,
        "sendWhatsApp"      boolean     NOT NULL DEFAULT false,
        "recurrence"        text        NOT NULL,
        "nextSendAt"        timestamptz NOT NULL,
        "active"            boolean     NOT NULL DEFAULT true,
        "lastAssignmentId"  uuid,
        "patientId"         uuid        NOT NULL,
        "psychologistId"    uuid        NOT NULL,
        "createdAt"         timestamptz NOT NULL DEFAULT now(),
        "updatedAt"         timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_instrument_schedules" PRIMARY KEY ("id"),
        CONSTRAINT "FK_instrument_schedules_patient" FOREIGN KEY ("patientId")
          REFERENCES "patients"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_instrument_schedules_psychologist" FOREIGN KEY ("psychologistId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_instrument_schedules_next_send" ON "instrument_schedules" ("nextSendAt")`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_instrument_schedules_active"    ON "instrument_schedules" ("active")`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_instrument_schedules_patient"   ON "instrument_schedules" ("patientId")`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_instrument_schedules_psych"     ON "instrument_schedules" ("psychologistId")`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "instrument_schedules"')
  }
}
