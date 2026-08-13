import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddTestimonialPublicIdentity1785330000000 implements MigrationInterface {
  name = 'AddTestimonialPublicIdentity1785330000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "publicIdentityConsent" boolean NOT NULL DEFAULT false')
    await queryRunner.query('ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "publicDisplayName" varchar(255)')
    await queryRunner.query('ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "publicCrp" varchar(50)')
    await queryRunner.query('ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "publicSpecialty" varchar(120)')
    await queryRunner.query('ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "publicCity" varchar(120)')
    await queryRunner.query('ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "publicAvatarUrl" varchar(500)')
    await queryRunner.query('ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "publicConsentAt" timestamptz')
    await queryRunner.query('ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "publicConsentVersion" varchar(20)')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const column of ['publicConsentVersion', 'publicConsentAt', 'publicAvatarUrl', 'publicCity', 'publicSpecialty', 'publicCrp', 'publicDisplayName', 'publicIdentityConsent']) {
      await queryRunner.query(`ALTER TABLE "testimonials" DROP COLUMN IF EXISTS "${column}"`)
    }
  }
}
