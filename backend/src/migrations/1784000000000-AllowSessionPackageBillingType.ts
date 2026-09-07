import { MigrationInterface, QueryRunner } from 'typeorm'

export class AllowSessionPackageBillingType1784000000000 implements MigrationInterface {
  name = 'AllowSessionPackageBillingType1784000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "patients" DROP CONSTRAINT IF EXISTS "CHK_patients_billing_type"`)
    await queryRunner.query(`
      ALTER TABLE "patients"
      ADD CONSTRAINT "CHK_patients_billing_type"
      CHECK ("billingType" IN ('per_session', 'monthly_package', 'session_package'))
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "patients" DROP CONSTRAINT IF EXISTS "CHK_patients_billing_type"`)
    await queryRunner.query(`
      ALTER TABLE "patients"
      ADD CONSTRAINT "CHK_patients_billing_type"
      CHECK ("billingType" IN ('per_session', 'monthly_package'))
    `)
  }
}
