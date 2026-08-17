import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddScoreToNeuropsychBatteryItems1785360000000 implements MigrationInterface {
  name = 'AddScoreToNeuropsychBatteryItems1785360000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "neuropsych_battery_items" ADD COLUMN IF NOT EXISTS "score" numeric(7,2)`)
    await queryRunner.query(`ALTER TABLE "neuropsych_battery_items" ADD COLUMN IF NOT EXISTS "scoreType" varchar(80)`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "neuropsych_battery_items" DROP COLUMN IF EXISTS "scoreType"')
    await queryRunner.query('ALTER TABLE "neuropsych_battery_items" DROP COLUMN IF EXISTS "score"')
  }
}
