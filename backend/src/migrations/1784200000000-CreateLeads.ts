import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateLeads1784200000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE IF NOT EXISTS "leads" (
        "id"          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        "name"        varchar(200) NOT NULL,
        "email"       varchar(200) NOT NULL,
        "profession"  varchar(20)  NOT NULL DEFAULT 'psicologia',
        "source"      varchar(100),
        "createdAt"   timestamptz  NOT NULL DEFAULT now()
      )
    `)
    await runner.query(`CREATE INDEX IF NOT EXISTS "idx_leads_email" ON "leads" ("email")`)
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP TABLE IF EXISTS "leads"`)
  }
}
