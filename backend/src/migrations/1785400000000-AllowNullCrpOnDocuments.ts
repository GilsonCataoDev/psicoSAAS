import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * CRP é do conselho de psicologia. Com outras profissões emitindo documentos,
 * a coluna passa a poder ser nula — antes disso, qualquer conta sem CRP
 * quebrava a criação de documento com violação de NOT NULL (erro 500).
 */
export class AllowNullCrpOnDocuments1785400000000 implements MigrationInterface {
  name = 'AllowNullCrpOnDocuments1785400000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "documents" ALTER COLUMN "psychologistCrp" DROP NOT NULL')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Documentos já emitidos sem CRP precisam de um valor antes de restaurar a
    // restrição, senão o ALTER falha.
    await queryRunner.query(`UPDATE "documents" SET "psychologistCrp" = '' WHERE "psychologistCrp" IS NULL`)
    await queryRunner.query('ALTER TABLE "documents" ALTER COLUMN "psychologistCrp" SET NOT NULL')
  }
}
