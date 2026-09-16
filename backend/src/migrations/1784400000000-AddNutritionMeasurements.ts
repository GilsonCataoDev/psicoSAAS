import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddNutritionMeasurements1784400000000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "nutritionWeight" numeric(5,2)`)
    await qr.query(`ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "nutritionHeight" numeric(5,2)`)
    await qr.query(`ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "nutritionWaistCirc" numeric(5,2)`)
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE "sessions" DROP COLUMN IF EXISTS "nutritionWaistCirc"`)
    await qr.query(`ALTER TABLE "sessions" DROP COLUMN IF EXISTS "nutritionHeight"`)
    await qr.query(`ALTER TABLE "sessions" DROP COLUMN IF EXISTS "nutritionWeight"`)
  }
}
