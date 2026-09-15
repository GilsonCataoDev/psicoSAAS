import { MigrationInterface, QueryRunner } from 'typeorm'

export class RaiseMonthlyIncludedSessionsMax1784100000000 implements MigrationInterface {
  name = 'RaiseMonthlyIncludedSessionsMax1784100000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "patients" DROP CONSTRAINT IF EXISTS "CHK_patients_monthly_included_sessions"')
    await queryRunner.query(
      'ALTER TABLE "patients" ADD CONSTRAINT "CHK_patients_monthly_included_sessions" CHECK ("monthlyIncludedSessions" BETWEEN 1 AND 200)',
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "patients" DROP CONSTRAINT IF EXISTS "CHK_patients_monthly_included_sessions"')
    await queryRunner.query(
      'ALTER TABLE "patients" ADD CONSTRAINT "CHK_patients_monthly_included_sessions" CHECK ("monthlyIncludedSessions" BETWEEN 1 AND 31)',
    )
  }
}
