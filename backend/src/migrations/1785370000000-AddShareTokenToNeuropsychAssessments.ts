import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddShareTokenToNeuropsychAssessments1785370000000 implements MigrationInterface {
  name = 'AddShareTokenToNeuropsychAssessments1785370000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "neuropsych_assessments" ADD COLUMN IF NOT EXISTS "shareTokenHash" text`)
    await queryRunner.query(`ALTER TABLE "neuropsych_assessments" ADD COLUMN IF NOT EXISTS "shareTokenCreatedAt" timestamptz`)
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_neuropsych_assessments_share_token" ON "neuropsych_assessments" ("shareTokenHash") WHERE "shareTokenHash" IS NOT NULL`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "UQ_neuropsych_assessments_share_token"')
    await queryRunner.query('ALTER TABLE "neuropsych_assessments" DROP COLUMN IF EXISTS "shareTokenCreatedAt"')
    await queryRunner.query('ALTER TABLE "neuropsych_assessments" DROP COLUMN IF EXISTS "shareTokenHash"')
  }
}
