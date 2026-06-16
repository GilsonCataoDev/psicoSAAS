import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddScoreToInstrumentAssignments1714500025000 implements MigrationInterface {
  name = 'AddScoreToInstrumentAssignments1714500025000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "instrument_assignments"
        ADD COLUMN IF NOT EXISTS "score" integer,
        ADD COLUMN IF NOT EXISTS "scoreDetails" text
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "instrument_assignments"
        DROP COLUMN IF EXISTS "score",
        DROP COLUMN IF EXISTS "scoreDetails"
    `)
  }
}
