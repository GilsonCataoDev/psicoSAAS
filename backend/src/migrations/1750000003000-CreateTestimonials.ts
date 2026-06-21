import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateTestimonials1750000003000 implements MigrationInterface {
  name = 'CreateTestimonials1750000003000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "testimonials" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "rating" integer,
        "text" text,
        "dismissed" boolean NOT NULL DEFAULT false,
        "approvedForPublic" boolean NOT NULL DEFAULT false,
        "publicConsent" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_testimonials" PRIMARY KEY ("id"),
        CONSTRAINT "FK_testimonials_userId" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_testimonials_rating" CHECK ("rating" IS NULL OR "rating" BETWEEN 1 AND 5),
        CONSTRAINT "CHK_testimonials_public_consent" CHECK (NOT "publicConsent" OR "text" IS NOT NULL),
        CONSTRAINT "CHK_testimonials_public_approval" CHECK (NOT "approvedForPublic" OR "publicConsent")
      )
    `)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_testimonials_userId"
      ON "testimonials" ("userId")
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_testimonials_approved"
      ON "testimonials" ("approvedForPublic")
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_testimonials_approved"')
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_testimonials_userId"')
    await queryRunner.query('DROP TABLE IF EXISTS "testimonials"')
  }
}
