import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateEmailLogs1750000001000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "email_logs" (
        "id"        uuid NOT NULL DEFAULT uuid_generate_v4(),
        "to"        varchar(320) NOT NULL,
        "subject"   varchar(255) NOT NULL,
        "status"    varchar(10) NOT NULL,
        "error"     text,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_email_logs" PRIMARY KEY ("id")
      )
    `)
    await queryRunner.query(`CREATE INDEX "IDX_email_logs_createdAt" ON "email_logs" ("createdAt")`)
    await queryRunner.query(`CREATE INDEX "IDX_email_logs_status"    ON "email_logs" ("status")`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "email_logs"`)
  }
}
