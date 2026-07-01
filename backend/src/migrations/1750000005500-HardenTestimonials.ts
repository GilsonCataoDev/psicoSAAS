import { MigrationInterface, QueryRunner } from 'typeorm'

export class HardenTestimonials1750000005500 implements MigrationInterface {
  name = 'HardenTestimonials1750000005500'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "testimonials"
      ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid
    `)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_testimonials_userId') THEN
          ALTER TABLE "testimonials"
          ADD CONSTRAINT "FK_testimonials_userId"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CHK_testimonials_rating') THEN
          ALTER TABLE "testimonials"
          ADD CONSTRAINT "CHK_testimonials_rating"
          CHECK ("rating" IS NULL OR "rating" BETWEEN 1 AND 5);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CHK_testimonials_public_consent') THEN
          ALTER TABLE "testimonials"
          ADD CONSTRAINT "CHK_testimonials_public_consent"
          CHECK (NOT "publicConsent" OR "text" IS NOT NULL);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CHK_testimonials_public_approval') THEN
          ALTER TABLE "testimonials"
          ADD CONSTRAINT "CHK_testimonials_public_approval"
          CHECK (NOT "approvedForPublic" OR "publicConsent");
        END IF;
      END
      $$
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "testimonials" DROP CONSTRAINT IF EXISTS "CHK_testimonials_public_approval"')
    await queryRunner.query('ALTER TABLE "testimonials" DROP CONSTRAINT IF EXISTS "CHK_testimonials_public_consent"')
    await queryRunner.query('ALTER TABLE "testimonials" DROP CONSTRAINT IF EXISTS "CHK_testimonials_rating"')
    await queryRunner.query('ALTER TABLE "testimonials" DROP CONSTRAINT IF EXISTS "FK_testimonials_userId"')
  }
}
