import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddFinancialChargeReminderError1785280000000 implements MigrationInterface {
  name = 'AddFinancialChargeReminderError1785280000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "financial_records" ADD COLUMN IF NOT EXISTS "chargeReminderError" varchar(160)`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "financial_records" DROP COLUMN IF EXISTS "chargeReminderError"`)
  }
}
