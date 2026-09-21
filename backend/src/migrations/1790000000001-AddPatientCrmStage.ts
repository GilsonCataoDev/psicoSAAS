import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddPatientCrmStage1790000000001 implements MigrationInterface {
  name = 'AddPatientCrmStage1790000000001'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "patients"
      ADD COLUMN IF NOT EXISTS "crmStage" varchar(30) NOT NULL DEFAULT 'lead'
    `)
    await queryRunner.query(`
      ALTER TABLE "patients"
      ADD CONSTRAINT "CK_patients_crmStage"
      CHECK ("crmStage" IN ('lead','first_session','active','inactive','discharged'))
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "patients" DROP CONSTRAINT IF EXISTS "CK_patients_crmStage"`)
    await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN IF EXISTS "crmStage"`)
  }
}
