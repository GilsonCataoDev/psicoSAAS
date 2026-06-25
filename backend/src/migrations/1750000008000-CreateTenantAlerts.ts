import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateTenantAlerts1750000008000 implements MigrationInterface {
  name = 'CreateTenantAlerts1750000008000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenant_alerts" (
        "id"          uuid        NOT NULL DEFAULT uuid_generate_v4(),
        "userId"      uuid        NOT NULL,
        "type"        varchar(64) NOT NULL,
        "message"     text        NOT NULL,
        "metadata"    jsonb,
        "resolved"    boolean     NOT NULL DEFAULT false,
        "resolvedAt"  timestamptz,
        "createdAt"   timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_alerts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tenant_alerts_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tenant_alerts_user_resolved"  ON "tenant_alerts" ("userId", "resolved")`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tenant_alerts_type"           ON "tenant_alerts" ("type")`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tenant_alerts_created_at"     ON "tenant_alerts" ("createdAt" DESC)`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_tenant_alerts_created_at"')
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_tenant_alerts_type"')
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_tenant_alerts_user_resolved"')
    await queryRunner.query('DROP TABLE IF EXISTS "tenant_alerts"')
  }
}
