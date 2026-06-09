import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddDemographicsToPatients1714500022000 implements MigrationInterface {
  name = 'AddDemographicsToPatients1714500022000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "patients"
      ADD COLUMN IF NOT EXISTS "race" character varying
    `)
    await queryRunner.query(`
      ALTER TABLE "patients"
      ADD COLUMN IF NOT EXISTS "gender" character varying
    `)
    await queryRunner.query(`
      ALTER TABLE "patients"
      ADD COLUMN IF NOT EXISTS "sexualOrientation" character varying
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN IF EXISTS "sexualOrientation"`)
    await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN IF EXISTS "gender"`)
    await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN IF EXISTS "race"`)
  }
}
