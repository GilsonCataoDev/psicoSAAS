import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddFinancialCategoryAndRecurringExpenses1785250000000 implements MigrationInterface {
  name = 'AddFinancialCategoryAndRecurringExpenses1785250000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "financial_records" ADD COLUMN IF NOT EXISTS "category" varchar(40)`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_financial_records_category" ON "financial_records" ("category")`)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "recurring_expenses" (
        "id"                uuid        NOT NULL DEFAULT uuid_generate_v4(),
        "description"       varchar(180) NOT NULL,
        "amount"            decimal(10,2) NOT NULL,
        "category"          varchar(40),
        "dayOfMonth"        integer     NOT NULL DEFAULT 1,
        "active"            boolean     NOT NULL DEFAULT true,
        "lastGeneratedMonth" varchar(7),
        "psychologistId"    uuid        NOT NULL,
        "createdAt"         timestamptz NOT NULL DEFAULT now(),
        "updatedAt"         timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_recurring_expenses" PRIMARY KEY ("id"),
        CONSTRAINT "FK_recurring_expenses_psychologist" FOREIGN KEY ("psychologistId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_recurring_expenses_psychologist" ON "recurring_expenses" ("psychologistId")`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_recurring_expenses_active"       ON "recurring_expenses" ("active")`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "recurring_expenses"')
    await queryRunner.query('ALTER TABLE "financial_records" DROP COLUMN IF EXISTS "category"')
  }
}
