import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAsaasProfileFields1714500009000 implements MigrationInterface {
  name = 'AddAsaasProfileFields1714500009000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "cpfCnpj" character varying')
    await queryRunner.query('ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "cpfCnpj" character varying')
    await queryRunner.query('ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "asaasCustomerId" character varying')
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "patients" DROP COLUMN IF EXISTS "asaasCustomerId"')
    await queryRunner.query('ALTER TABLE "patients" DROP COLUMN IF EXISTS "cpfCnpj"')
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "cpfCnpj"')
  }
}
