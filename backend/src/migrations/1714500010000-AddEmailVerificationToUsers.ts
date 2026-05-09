import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddEmailVerificationToUsers1714500010000 implements MigrationInterface {
  name = 'AddEmailVerificationToUsers1714500010000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerified" boolean NOT NULL DEFAULT false')
    await queryRunner.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerificationToken" character varying')
    await queryRunner.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerificationExpiry" TIMESTAMP WITH TIME ZONE')
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "emailVerificationExpiry"')
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "emailVerificationToken"')
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "emailVerified"')
  }
}
