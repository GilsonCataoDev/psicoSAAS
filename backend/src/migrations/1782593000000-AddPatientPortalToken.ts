import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddPatientPortalToken1782593000000 implements MigrationInterface {
  name = 'AddPatientPortalToken1782593000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "portalTokenHash" text`)
    await queryRunner.query(`ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "portalTokenCreatedAt" timestamptz`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_patients_portal_token_hash" ON "patients" ("portalTokenHash")`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_patients_portal_token_hash"`)
    await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN IF EXISTS "portalTokenCreatedAt"`)
    await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN IF EXISTS "portalTokenHash"`)
  }
}
