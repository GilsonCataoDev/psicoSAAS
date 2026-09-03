import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Suporte opcional a armazenamento externo (Cloudflare R2) para anexos
 * clínicos. `storageKey` guarda a key do objeto no bucket privado quando
 * ATTACHMENTS_STORAGE_DRIVER=r2; `data` permanece o caminho padrão
 * (Postgres) e fica nullable pra acomodar o registro que usa storageKey.
 * Nenhum anexo existente é migrado — todos continuam com `data` preenchido.
 */
export class AddPatientAttachmentStorageKey1782900000000 implements MigrationInterface {
  name = 'AddPatientAttachmentStorageKey1782900000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "patient_attachments"
      ALTER COLUMN "data" DROP NOT NULL
    `)
    await queryRunner.query(`
      ALTER TABLE "patient_attachments"
      ADD COLUMN IF NOT EXISTS "storageKey" character varying
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "patient_attachments" DROP COLUMN IF EXISTS "storageKey"')
    await queryRunner.query('ALTER TABLE "patient_attachments" ALTER COLUMN "data" SET NOT NULL')
  }
}
