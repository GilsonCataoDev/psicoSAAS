import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateTenantActivation1750000007000 implements MigrationInterface {
  name = 'CreateTenantActivation1750000007000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenant_activations" (
        "id"                uuid        NOT NULL DEFAULT uuid_generate_v4(),
        "userId"            uuid        NOT NULL,
        "activated"         boolean     NOT NULL DEFAULT false,
        "activatedAt"       timestamptz,
        "patientCount"      integer     NOT NULL DEFAULT 0,
        "sessionCount"      integer     NOT NULL DEFAULT 0,
        "appointmentCount"  integer     NOT NULL DEFAULT 0,
        "needsOnboarding"   boolean     NOT NULL DEFAULT false,
        "needsOnboardingAt" timestamptz,
        "createdAt"         timestamptz NOT NULL DEFAULT now(),
        "updatedAt"         timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_activations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tenant_activations_user" UNIQUE ("userId"),
        CONSTRAINT "FK_tenant_activations_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tenant_activations_activated"      ON "tenant_activations" ("activated")`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tenant_activations_needs_onboard"  ON "tenant_activations" ("needsOnboarding") WHERE "needsOnboarding" = true`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_tenant_activations_needs_onboard"')
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_tenant_activations_activated"')
    await queryRunner.query('DROP TABLE IF EXISTS "tenant_activations"')
  }
}
