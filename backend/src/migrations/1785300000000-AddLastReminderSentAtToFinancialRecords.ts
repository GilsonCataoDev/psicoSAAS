import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddLastReminderSentAtToFinancialRecords1785300000000 implements MigrationInterface {
  name = 'AddLastReminderSentAtToFinancialRecords1785300000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "financial_records" ADD COLUMN IF NOT EXISTS "lastReminderSentAt" date')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "financial_records" DROP COLUMN IF EXISTS "lastReminderSentAt"')
  }
}
