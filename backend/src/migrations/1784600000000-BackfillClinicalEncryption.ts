import { MigrationInterface, QueryRunner } from 'typeorm'
import { encrypt, safeDecrypt } from '../common/crypto/encrypt.util'

const DOCUMENT_PREFIX = 'usecognia.document.v1:'
const LEGACY_DOCUMENT_PREFIX = 'psicosaas.document.v1:'

function reencrypt(value: string | null | undefined): string | null {
  if (!value) return null
  return encrypt(safeDecrypt(value) ?? value)
}

function reencryptDocument(value: string): string {
  const payload = value.startsWith(DOCUMENT_PREFIX)
    ? value.slice(DOCUMENT_PREFIX.length)
    : value.startsWith(LEGACY_DOCUMENT_PREFIX)
      ? value.slice(LEGACY_DOCUMENT_PREFIX.length)
      : value
  return `${DOCUMENT_PREFIX}${encrypt(safeDecrypt(payload) ?? payload)}`
}

export class BackfillClinicalEncryption1784600000000 implements MigrationInterface {
  name = 'BackfillClinicalEncryption1784600000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    const patients: Array<{ id: string; privateNotes: string | null; prontuario: any }> =
      await queryRunner.query('SELECT "id", "privateNotes", "prontuario" FROM "patients"')
    for (const patient of patients) {
      let prontuario = patient.prontuario
      if (prontuario) {
        if (typeof prontuario === 'string') {
          try { prontuario = JSON.parse(prontuario) } catch { /* keep as string */ }
        }
        const raw = prontuario?.data && prontuario?.__encrypted
          ? (safeDecrypt(prontuario.data) ?? prontuario.data)
          : JSON.stringify(prontuario)
        prontuario = { __encrypted: 'usecognia.prontuario.v1', data: encrypt(raw) }
      }
      await queryRunner.query(
        'UPDATE "patients" SET "privateNotes" = $1, "prontuario" = $2 WHERE "id" = $3',
        [reencrypt(patient.privateNotes), prontuario ? JSON.stringify(prontuario) : null, patient.id],
      )
    }

    await this.reencryptColumns(queryRunner, 'patients', [
      'birthDate', 'pronouns', 'race', 'gender', 'sexualOrientation', 'cpfCnpj',
    ])

    await this.reencryptColumns(queryRunner, 'sessions', ['summary', 'privateNotes', 'nextSteps'])
    await this.reencryptColumns(queryRunner, 'instrument_assignments', ['responseText', 'responseData'])
    await this.reencryptColumns(queryRunner, 'neuropsych_assessments', [
      'referralQuestion', 'clinicalHistory', 'clinicalHypotheses',
      'qualitativeObservations', 'integrationDraft', 'professionalConclusion',
    ])
    await this.reencryptColumns(queryRunner, 'neuropsych_battery_items', [
      'purpose', 'resultSummary', 'qualitativeNotes',
    ])

    const documents: Array<{ id: string; content: string }> =
      await queryRunner.query('SELECT "id", "content" FROM "documents"')
    for (const document of documents) {
      await queryRunner.query(
        'UPDATE "documents" SET "content" = $1 WHERE "id" = $2',
        [reencryptDocument(document.content), document.id],
      )
    }
  }

  async down(): Promise<void> {
    // Irreversivel por seguranca: versoes antigas ja entendem os valores cifrados.
  }

  private async reencryptColumns(queryRunner: QueryRunner, table: string, columns: string[]): Promise<void> {
    const select = ['"id"', ...columns.map(column => `"${column}"`)].join(', ')
    const rows: Array<Record<string, string | null>> = await queryRunner.query(`SELECT ${select} FROM "${table}"`)
    for (const row of rows) {
      const values = columns.map(column => reencrypt(row[column]))
      if (values.every(value => value === null)) continue
      const set = columns.map((column, index) => `"${column}" = $${index + 1}`).join(', ')
      await queryRunner.query(
        `UPDATE "${table}" SET ${set} WHERE "id" = $${columns.length + 1}`,
        [...values, row.id],
      )
    }
  }
}
