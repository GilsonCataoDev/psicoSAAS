import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddInstrumentResponseData1714500017000 implements MigrationInterface {
  name = 'AddInstrumentResponseData1714500017000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "instrument_assignments" ADD COLUMN IF NOT EXISTS "responseData" text')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "instrument_assignments" DROP COLUMN IF EXISTS "responseData"')
  }
}
