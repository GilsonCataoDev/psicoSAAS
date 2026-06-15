import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateLoginAttempts1714500024000 implements MigrationInterface {
  name = 'CreateLoginAttempts1714500024000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "login_attempts" (
        "email" varchar(254) PRIMARY KEY,
        "count" integer NOT NULL DEFAULT 0,
        "resetAt" timestamptz NOT NULL,
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "login_attempts"')
  }
}
