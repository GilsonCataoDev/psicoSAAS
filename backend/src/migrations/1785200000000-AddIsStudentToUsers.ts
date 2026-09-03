import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Suporte a cadastro de estudantes de psicologia sem CRP. `crp` deixa de ser
 * obrigatório; `isStudent` marca a conta. Documentos oficiais assinados
 * (DocumentsService.create) continuam exigindo CRP preenchido — students
 * completam o CRP depois pelo perfil para desbloquear esse recurso.
 */
export class AddIsStudentToUsers1785200000000 implements MigrationInterface {
  name = 'AddIsStudentToUsers1785200000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "crp" DROP NOT NULL
    `)
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "isStudent" boolean NOT NULL DEFAULT false
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "isStudent"')
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "crp" SET NOT NULL')
  }
}
