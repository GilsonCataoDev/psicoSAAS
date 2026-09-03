import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Adiciona `profession` em users com default 'psicologia': toda conta existente
 * continua vendo exatamente a interface atual. Só contas que escolherem outra
 * profissão passam a usar o vocabulário genérico.
 */
export class AddProfessionToUsers1785380000000 implements MigrationInterface {
  name = 'AddProfessionToUsers1785380000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profession" varchar(40) NOT NULL DEFAULT 'psicologia'`,
    )
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_users_profession" ON "users" ("profession")`,
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_users_profession"')
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "profession"')
  }
}
