import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAuditLogs1714500018000 implements MigrationInterface {
  name = 'CreateAuditLogs1714500018000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying NOT NULL,
        "action" character varying NOT NULL,
        "resource" character varying NOT NULL,
        "resourceId" character varying,
        "metadata" jsonb,
        "ip" character varying,
        "userAgent" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs_id" PRIMARY KEY ("id")
      )
    `)
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_audit_logs_user_created" ON "audit_logs" ("userId", "createdAt")')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_audit_logs_user_created"')
    await queryRunner.query('DROP TABLE IF EXISTS "audit_logs"')
  }
}
