import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddCorePerformanceIndexes1750000005000 implements MigrationInterface {
  name = 'AddCorePerformanceIndexes1750000005000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sessions_psychologist_date"
      ON "sessions" ("psychologistId", "date" DESC)
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_documents_user_created"
      ON "documents" ("userId", "createdAt" DESC)
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_booking_pages_active_psychologist_prefix"
      ON "booking_pages" (LEFT(REPLACE("psychologistId"::text, '-', ''), 8))
      WHERE "isActive" = true
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_booking_pages_active_psychologist_prefix"')
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_documents_user_created"')
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_sessions_psychologist_date"')
  }
}
