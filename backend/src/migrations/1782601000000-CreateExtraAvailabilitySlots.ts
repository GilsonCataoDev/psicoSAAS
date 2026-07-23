import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateExtraAvailabilitySlots1782601000000 implements MigrationInterface {
  name = 'CreateExtraAvailabilitySlots1782601000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "extra_availability_slots" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "date" date NOT NULL,
        "startTime" time NOT NULL,
        "endTime" time NOT NULL,
        "modality" character varying NOT NULL DEFAULT 'online',
        "isActive" boolean NOT NULL DEFAULT true,
        "psychologistId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_extra_availability_slots" PRIMARY KEY ("id")
      )
    `)
    await queryRunner.query(`
      ALTER TABLE "extra_availability_slots"
      ADD CONSTRAINT "FK_extra_availability_slots_user"
      FOREIGN KEY ("psychologistId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_extra_availability_slots_lookup"
      ON "extra_availability_slots" ("psychologistId", "date", "modality", "isActive")
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_extra_availability_slots_lookup"')
    await queryRunner.query('ALTER TABLE "extra_availability_slots" DROP CONSTRAINT IF EXISTS "FK_extra_availability_slots_user"')
    await queryRunner.query('DROP TABLE IF EXISTS "extra_availability_slots"')
  }
}
