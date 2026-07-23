import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateProspecting1782700000000 implements MigrationInterface {
  name = 'CreateProspecting1782700000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "prospects" (
        "id"                 uuid        NOT NULL DEFAULT uuid_generate_v4(),
        "professionalName"   varchar(255),
        "city"               varchar(120),
        "state"              varchar(2),
        "website"            varchar(500),
        "websiteDomain"      varchar(255),
        "professionalEmail"  varchar(255),
        "professionalPhone"  varchar(32),
        "linkedinUrl"        varchar(500),
        "psymeetUrl"         varchar(500),
        "sourceUrl"          varchar(500) NOT NULL,
        "sourceType"         varchar(32)  NOT NULL,
        "sourceTitle"        varchar(500),
        "sourceSnippet"      text,
        "score"              integer      NOT NULL DEFAULT 0,
        "confidence"         varchar(16)  NOT NULL DEFAULT 'low',
        "status"             varchar(24)  NOT NULL DEFAULT 'discovered',
        "privacyBasis"       varchar(64)  NOT NULL DEFAULT 'legitimate_interest_public_professional_data',
        "discoveredAt"       timestamptz  NOT NULL DEFAULT now(),
        "analyzedAt"         timestamptz,
        "lastContactAt"      timestamptz,
        "retentionUntil"     timestamptz  NOT NULL,
        "doNotContact"       boolean      NOT NULL DEFAULT false,
        "doNotContactAt"     timestamptz,
        "deletedAt"          timestamptz,
        "residualHash"       varchar(128),
        "createdAt"          timestamptz  NOT NULL DEFAULT now(),
        "updatedAt"          timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "PK_prospects" PRIMARY KEY ("id")
      )
    `)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_prospects_score"           ON "prospects" ("score" DESC)`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_prospects_status"          ON "prospects" ("status")`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_prospects_city_state"      ON "prospects" ("city", "state")`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_prospects_domain"          ON "prospects" ("websiteDomain")`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_prospects_email"           ON "prospects" ("professionalEmail")`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_prospects_phone"           ON "prospects" ("professionalPhone")`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_prospects_retention_until" ON "prospects" ("retentionUntil")`)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "prospect_signals" (
        "id"          uuid        NOT NULL DEFAULT uuid_generate_v4(),
        "prospectId"  uuid        NOT NULL,
        "type"        varchar(64) NOT NULL,
        "points"      integer     NOT NULL,
        "confidence"  varchar(16) NOT NULL DEFAULT 'low',
        "evidence"    text        NOT NULL,
        "evidenceUrl" varchar(500),
        "detector"    varchar(64) NOT NULL,
        "detectedAt"  timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_prospect_signals" PRIMARY KEY ("id"),
        CONSTRAINT "FK_prospect_signals_prospect" FOREIGN KEY ("prospectId")
          REFERENCES "prospects"("id") ON DELETE CASCADE
      )
    `)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_prospect_signals_prospect" ON "prospect_signals" ("prospectId")`)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "prospect_activities" (
        "id"           uuid        NOT NULL DEFAULT uuid_generate_v4(),
        "prospectId"   uuid        NOT NULL,
        "action"       varchar(64) NOT NULL,
        "actorUserId"  uuid,
        "notes"        text,
        "metadata"     jsonb,
        "createdAt"    timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_prospect_activities" PRIMARY KEY ("id"),
        CONSTRAINT "FK_prospect_activities_prospect" FOREIGN KEY ("prospectId")
          REFERENCES "prospects"("id") ON DELETE CASCADE
      )
    `)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_prospect_activities_prospect" ON "prospect_activities" ("prospectId")`)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "prospecting_searches" (
        "id"            uuid        NOT NULL DEFAULT uuid_generate_v4(),
        "city"          varchar(120),
        "state"         varchar(2),
        "query"         text        NOT NULL,
        "provider"      varchar(32) NOT NULL,
        "resultCount"   integer     NOT NULL DEFAULT 0,
        "status"        varchar(24) NOT NULL DEFAULT 'pending',
        "costEstimate"  numeric(10,4) NOT NULL DEFAULT 0,
        "startedAt"     timestamptz,
        "finishedAt"    timestamptz,
        "errorMessage"  text,
        "createdAt"     timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_prospecting_searches" PRIMARY KEY ("id")
      )
    `)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_prospecting_searches_status" ON "prospecting_searches" ("status")`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "prospecting_searches"')
    await queryRunner.query('DROP TABLE IF EXISTS "prospect_activities"')
    await queryRunner.query('DROP TABLE IF EXISTS "prospect_signals"')
    await queryRunner.query('DROP TABLE IF EXISTS "prospects"')
  }
}
