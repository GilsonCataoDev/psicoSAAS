import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddPatientAcquisitionSource1790000000002 implements MigrationInterface {
  name = 'AddPatientAcquisitionSource1790000000002'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "patients"
      ADD COLUMN IF NOT EXISTS "acquisitionSource" text NULL
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN IF EXISTS "acquisitionSource"`)
  }
}
