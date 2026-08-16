import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddSessionIntegrityAddendaAndRevisions1785300000000 implements MigrationInterface {
  name = 'AddSessionIntegrityAddendaAndRevisions1785300000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "contentHash" varchar(64)`)
    await queryRunner.query(`ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "lastEditedAt" timestamptz`)
    await queryRunner.query(`ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "addenda" text`)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "session_revisions" (
        "id"             uuid        NOT NULL DEFAULT uuid_generate_v4(),
        "sessionId"      uuid        NOT NULL,
        "psychologistId" uuid        NOT NULL,
        "summary"        text,
        "privateNotes"   text,
        "nextSteps"      text,
        "editedAt"       timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_session_revisions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_session_revisions_session" FOREIGN KEY ("sessionId")
          REFERENCES "sessions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_session_revisions_psychologist" FOREIGN KEY ("psychologistId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_session_revisions_session" ON "session_revisions" ("sessionId")`)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "note_snippets" (
        "id"             uuid        NOT NULL DEFAULT uuid_generate_v4(),
        "psychologistId" uuid        NOT NULL,
        "label"          varchar(60) NOT NULL,
        "content"        text        NOT NULL,
        "createdAt"      timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_note_snippets" PRIMARY KEY ("id"),
        CONSTRAINT "FK_note_snippets_psychologist" FOREIGN KEY ("psychologistId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_note_snippets_psychologist" ON "note_snippets" ("psychologistId")`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "note_snippets"')
    await queryRunner.query('DROP TABLE IF EXISTS "session_revisions"')
    await queryRunner.query('ALTER TABLE "sessions" DROP COLUMN IF EXISTS "addenda"')
    await queryRunner.query('ALTER TABLE "sessions" DROP COLUMN IF EXISTS "lastEditedAt"')
    await queryRunner.query('ALTER TABLE "sessions" DROP COLUMN IF EXISTS "contentHash"')
  }
}
