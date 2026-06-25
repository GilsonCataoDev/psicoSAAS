import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateTenantHealth1750000006000 implements MigrationInterface {
  name = 'CreateTenantHealth1750000006000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenant_health" (
        "id"                uuid        NOT NULL DEFAULT uuid_generate_v4(),
        "userId"            uuid        NOT NULL,
        "score"             integer     NOT NULL DEFAULT 0,
        "riskLevel"         varchar(16) NOT NULL DEFAULT 'CRITICAL',
        "scoreBreakdown"    jsonb,
        "reasons"           jsonb,
        "recommendations"   jsonb,
        "previousScore"     integer,
        "lastCalculatedAt"  timestamptz NOT NULL DEFAULT now(),
        "createdAt"         timestamptz NOT NULL DEFAULT now(),
        "updatedAt"         timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_health" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tenant_health_user" UNIQUE ("userId"),
        CONSTRAINT "FK_tenant_health_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tenant_health_risk_level"    ON "tenant_health" ("riskLevel")`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tenant_health_score"         ON "tenant_health" ("score" DESC)`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tenant_health_calculated_at" ON "tenant_health" ("lastCalculatedAt" DESC)`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_tenant_health_calculated_at"')
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_tenant_health_score"')
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_tenant_health_risk_level"')
    await queryRunner.query('DROP TABLE IF EXISTS "tenant_health"')
  }
}
