import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddSessionNoteTemplateType1714500020000 implements MigrationInterface {
  name = 'AddSessionNoteTemplateType1714500020000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TYPE "template_type_enum" ADD VALUE IF NOT EXISTS 'session_note';
      EXCEPTION
        WHEN undefined_object THEN null;
      END $$;
    `)
  }

  async down(): Promise<void> {
    // PostgreSQL does not support dropping enum values safely.
  }
}
