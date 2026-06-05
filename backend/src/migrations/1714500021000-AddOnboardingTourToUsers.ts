import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddOnboardingTourToUsers1714500021000 implements MigrationInterface {
  name = 'AddOnboardingTourToUsers1714500021000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "firstLogin" boolean NOT NULL DEFAULT true
    `)
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "onboardingStep" integer NOT NULL DEFAULT 0
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "onboardingStep"`)
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "firstLogin"`)
  }
}
