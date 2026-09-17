import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateInventoryItems1785430000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE IF NOT EXISTS "inventory_items" (
        "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId"      uuid NOT NULL,
        "name"        varchar(200) NOT NULL,
        "category"    varchar(100),
        "unit"        varchar(20) NOT NULL,
        "quantity"    numeric(10,2) NOT NULL DEFAULT 0,
        "minQuantity" numeric(10,2),
        "supplier"    varchar(200),
        "notes"       text,
        "createdAt"   timestamptz NOT NULL DEFAULT now(),
        "updatedAt"   timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_inventory_items_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `)
    await runner.query(`
      CREATE INDEX IF NOT EXISTS "idx_inventory_items_userId"
        ON "inventory_items" ("userId")
    `)
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP TABLE IF EXISTS "inventory_items"`)
  }
}
