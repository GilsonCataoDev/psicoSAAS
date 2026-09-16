import { MigrationInterface, QueryRunner } from 'typeorm'

export class UniqueLeadEmail1784300000000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP INDEX IF EXISTS "idx_leads_email"`)
    await qr.query(`CREATE UNIQUE INDEX "idx_leads_email_source" ON "leads" ("email", "source")`)
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP INDEX IF EXISTS "idx_leads_email_source"`)
    await qr.query(`CREATE INDEX "idx_leads_email" ON "leads" ("email")`)
  }
}
