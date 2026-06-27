import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAppointmentMeetingUrl1782594000000 implements MigrationInterface {
  name = 'AddAppointmentMeetingUrl1782594000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "meetingUrl" character varying`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN IF EXISTS "meetingUrl"`)
  }
}
