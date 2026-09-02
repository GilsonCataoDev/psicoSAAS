import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Templates são globais (não têm tenant). Para servir o conjunto certo a cada
 * profissão, ganham uma coluna `profession`. Os já existentes são marcados como
 * 'psicologia', que é o que eles de fato são — nada muda para quem já usa.
 *
 * O índice único parcial garante um único default por (tipo, profissão),
 * substituindo a convenção anterior de "o mais antigo com isDefault vence".
 */
export class AddProfessionToTemplates1785390000000 implements MigrationInterface {
  name = 'AddProfessionToTemplates1785390000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "profession" varchar(40) NOT NULL DEFAULT 'psicologia'`,
    )
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_templates_profession_type" ON "templates" ("profession", "type")`,
    )
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_templates_default_per_profession"
       ON "templates" ("type", "profession") WHERE "isDefault" = true`,
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "UQ_templates_default_per_profession"')
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_templates_profession_type"')
    await queryRunner.query('ALTER TABLE "templates" DROP COLUMN IF EXISTS "profession"')
  }
}
