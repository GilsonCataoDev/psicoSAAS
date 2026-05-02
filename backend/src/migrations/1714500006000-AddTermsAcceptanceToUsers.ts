import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddTermsAcceptanceToUsers1714500006000 implements MigrationInterface {
  name = 'AddTermsAcceptanceToUsers1714500006000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMP WITH TIME ZONE')
    await queryRunner.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "termsVersion" character varying(20)')
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "termsVersion"')
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "termsAcceptedAt"')
  }
}
