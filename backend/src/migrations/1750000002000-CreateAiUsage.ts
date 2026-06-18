import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAiUsage1750000002000 implements MigrationInterface {
  name = 'CreateAiUsage1750000002000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ai_usage" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "month" varchar(7) NOT NULL,
        "transcriptionSeconds" integer NOT NULL DEFAULT 0,
        "summaryRequests" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ai_usage" PRIMARY KEY ("id")
      )
    `)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_ai_usage_user_month"
      ON "ai_usage" ("userId", "month")
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_ai_usage_user_month"')
    await queryRunner.query('DROP TABLE IF EXISTS "ai_usage"')
  }
}
