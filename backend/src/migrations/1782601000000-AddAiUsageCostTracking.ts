import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAiUsageCostTracking1782601000000 implements MigrationInterface {
  name = 'AddAiUsageCostTracking1782601000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ai_usage"
      ADD COLUMN IF NOT EXISTS "aiInputTokens" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "aiOutputTokens" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "aiCostUsdMicros" integer NOT NULL DEFAULT 0
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ai_usage"
      DROP COLUMN IF EXISTS "aiCostUsdMicros",
      DROP COLUMN IF EXISTS "aiOutputTokens",
      DROP COLUMN IF EXISTS "aiInputTokens"
    `)
  }
}
