import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddModalityToAvailabilitySlots1714500008000 implements MigrationInterface {
  name = 'AddModalityToAvailabilitySlots1714500008000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "availability_slots" ADD COLUMN IF NOT EXISTS "modality" character varying NOT NULL DEFAULT \'online\'')
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "availability_slots" DROP COLUMN IF EXISTS "modality"')
  }
}
