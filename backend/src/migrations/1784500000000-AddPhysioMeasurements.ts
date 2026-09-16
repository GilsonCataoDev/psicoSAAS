import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddPhysioMeasurements1784500000000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "physioRom" numeric(5,1)`)
    await qr.query(`ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "physioStrength" numeric(3,1)`)
    await qr.query(`ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "physioFunctional" numeric(5,1)`)
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE "sessions" DROP COLUMN IF EXISTS "physioFunctional"`)
    await qr.query(`ALTER TABLE "sessions" DROP COLUMN IF EXISTS "physioStrength"`)
    await qr.query(`ALTER TABLE "sessions" DROP COLUMN IF EXISTS "physioRom"`)
  }
}
