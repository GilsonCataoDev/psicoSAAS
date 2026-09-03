import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddCallTranscriptionUsage1785270000000 implements MigrationInterface {
  name = 'AddCallTranscriptionUsage1785270000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "ai_usage" ADD COLUMN IF NOT EXISTS "callTranscriptions" integer NOT NULL DEFAULT 0',
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "ai_usage" DROP COLUMN IF EXISTS "callTranscriptions"',
    )
  }
}
