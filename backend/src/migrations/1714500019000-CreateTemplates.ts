import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateTemplates1714500019000 implements MigrationInterface {
  name = 'CreateTemplates1714500019000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "template_type_enum" AS ENUM ('patient_form', 'document', 'whatsapp_message', 'receipt');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "templates" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "type" "template_type_enum" NOT NULL,
        "name" character varying NOT NULL,
        "content" text NOT NULL,
        "tags" text[] NOT NULL DEFAULT '{}',
        "isDefault" boolean NOT NULL DEFAULT true,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_templates_type" ON "templates" ("type")')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_templates_type"')
    await queryRunner.query('DROP TABLE IF EXISTS "templates"')
    await queryRunner.query('DROP TYPE IF EXISTS "template_type_enum"')
  }
}
