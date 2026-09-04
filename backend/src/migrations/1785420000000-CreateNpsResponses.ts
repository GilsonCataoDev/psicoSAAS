import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateNpsResponses1785420000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE IF NOT EXISTS "nps_responses" (
        "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId"     uuid NOT NULL,
        "patientId"  uuid,
        "sessionId"  uuid,
        "token"      varchar(64) UNIQUE NOT NULL,
        "score"      smallint,
        "comment"    text,
        "responded"  boolean NOT NULL DEFAULT false,
        "createdAt"  timestamptz NOT NULL DEFAULT now()
      )
    `)
    await runner.query(`CREATE INDEX IF NOT EXISTS "idx_nps_userId" ON "nps_responses" ("userId")`)
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP TABLE IF EXISTS "nps_responses"`)
  }
}
