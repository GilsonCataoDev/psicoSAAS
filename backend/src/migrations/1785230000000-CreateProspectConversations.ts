import { MigrationInterface, QueryRunner } from 'typeorm'

// Entidades ProspectConversation/ProspectMessage (backend/src/modules/prospecting/entities/)
// foram criadas e registradas no ProspectingModule sem uma migracao correspondente,
// o que nunca criou as tabelas em producao — o cron `prospecting-cron-metrics`
// (roda de hora em hora) falhava com "relation prospect_conversations does not exist".
export class CreateProspectConversations1785230000000 implements MigrationInterface {
  name = 'CreateProspectConversations1785230000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "prospect_conversations" (
        "id"              uuid        NOT NULL DEFAULT uuid_generate_v4(),
        "prospectId"      uuid        NOT NULL,
        "channel"         varchar(16) NOT NULL,
        "status"          varchar(24) NOT NULL DEFAULT 'draft',
        "assignedUserId"  uuid,
        "lastInboundAt"   timestamptz,
        "lastOutboundAt"  timestamptz,
        "nextFollowUpAt"  timestamptz,
        "followUpCount"   integer     NOT NULL DEFAULT 0,
        "createdAt"       timestamptz NOT NULL DEFAULT now(),
        "updatedAt"       timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_prospect_conversations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_prospect_conversations_prospect" FOREIGN KEY ("prospectId")
          REFERENCES "prospects"("id") ON DELETE CASCADE
      )
    `)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_prospect_conversations_prospect" ON "prospect_conversations" ("prospectId")`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_prospect_conversations_status"   ON "prospect_conversations" ("status")`)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "prospect_messages" (
        "id"                 uuid        NOT NULL DEFAULT uuid_generate_v4(),
        "conversationId"     uuid        NOT NULL,
        "direction"          varchar(16) NOT NULL,
        "status"             varchar(24) NOT NULL DEFAULT 'draft',
        "content"            text        NOT NULL,
        "aiGenerated"        boolean     NOT NULL DEFAULT false,
        "approvedByUserId"   uuid,
        "approvedAt"         timestamptz,
        "providerMessageId"  varchar(255),
        "errorMessage"       text,
        "sentAt"             timestamptz,
        "deliveredAt"        timestamptz,
        "createdAt"          timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_prospect_messages" PRIMARY KEY ("id"),
        CONSTRAINT "FK_prospect_messages_conversation" FOREIGN KEY ("conversationId")
          REFERENCES "prospect_conversations"("id") ON DELETE CASCADE
      )
    `)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_prospect_messages_conversation" ON "prospect_messages" ("conversationId")`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_prospect_messages_status"       ON "prospect_messages" ("status")`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "prospect_messages"')
    await queryRunner.query('DROP TABLE IF EXISTS "prospect_conversations"')
  }
}
