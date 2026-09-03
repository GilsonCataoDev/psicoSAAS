import { MigrationInterface, QueryRunner } from 'typeorm'

export class DeduplicateTenantAlerts1782800000000 implements MigrationInterface {
  name = 'DeduplicateTenantAlerts1782800000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM tenant_alerts older
      USING tenant_alerts newer
      WHERE older."userId" = newer."userId"
        AND older.type = newer.type
        AND older.resolved = false
        AND newer.resolved = false
        AND (older."createdAt", older.id) < (newer."createdAt", newer.id)
    `)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_tenant_alerts_unresolved_user_type"
      ON tenant_alerts ("userId", type) WHERE resolved = false
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "UQ_tenant_alerts_unresolved_user_type"')
  }
}
