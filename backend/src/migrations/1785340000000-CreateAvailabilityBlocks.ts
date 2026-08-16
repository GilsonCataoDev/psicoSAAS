import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAvailabilityBlocks1785340000000 implements MigrationInterface {
  name = 'CreateAvailabilityBlocks1785340000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "availability_blocks" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "type" character varying NOT NULL,
        "weekday" smallint,
        "date" date,
        "startTime" time NOT NULL,
        "endTime" time NOT NULL,
        "reason" character varying,
        "psychologistId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_availability_blocks_type"
          CHECK ("type" IN ('weekly', 'date')),
        CONSTRAINT "CHK_availability_blocks_target"
          CHECK (
            ("type" = 'weekly' AND "weekday" IS NOT NULL AND "date" IS NULL AND "weekday" BETWEEN 0 AND 6)
            OR
            ("type" = 'date' AND "date" IS NOT NULL AND "weekday" IS NULL)
          ),
        CONSTRAINT "CHK_availability_blocks_time"
          CHECK ("startTime" < "endTime")
      )
    `)

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_availability_blocks_psychologist'
        ) THEN
          ALTER TABLE "availability_blocks"
          ADD CONSTRAINT "FK_availability_blocks_psychologist"
          FOREIGN KEY ("psychologistId") REFERENCES "users"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_availability_blocks_weekly"
      ON "availability_blocks" ("psychologistId", "weekday")
      WHERE "type" = 'weekly'
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_availability_blocks_date"
      ON "availability_blocks" ("psychologistId", "date")
      WHERE "type" = 'date'
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_availability_blocks_date"')
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_availability_blocks_weekly"')
    await queryRunner.query('ALTER TABLE "availability_blocks" DROP CONSTRAINT IF EXISTS "FK_availability_blocks_psychologist"')
    await queryRunner.query('DROP TABLE IF EXISTS "availability_blocks"')
  }
}
