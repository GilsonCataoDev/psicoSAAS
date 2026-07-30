import { MigrationInterface, QueryRunner } from 'typeorm'
import { blindIndex, encrypt, safeDecrypt } from '../common/crypto/encrypt.util'

const enc = (value?: string | null) => value ? encrypt(safeDecrypt(value) ?? value) : null

export class ProtectContactData1785210000000 implements MigrationInterface {
  name = 'ProtectContactData1785210000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "emailHash" varchar(64)')
    await queryRunner.query('ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "phoneHash" varchar(64)')
    await queryRunner.query('ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "patientEmailHash" varchar(64)')
    await queryRunner.query('ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "patientPhoneHash" varchar(64)')
    await queryRunner.query('ALTER TABLE "email_logs" ADD COLUMN IF NOT EXISTS "toHash" varchar(64)')
    await queryRunner.query('ALTER TABLE "email_logs" ALTER COLUMN "to" TYPE text')
    await queryRunner.query('ALTER TABLE "email_logs" ALTER COLUMN "subject" TYPE text')
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "email_suppressions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" text NOT NULL,
        "emailHash" varchar(64),
        "reason" varchar(20) NOT NULL,
        "sourceEventType" varchar(50),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_email_suppressions" PRIMARY KEY ("id")
      )
    `)
    await queryRunner.query('ALTER TABLE "email_suppressions" ADD COLUMN IF NOT EXISTS "emailHash" varchar(64)')
    await queryRunner.query('ALTER TABLE "email_suppressions" ALTER COLUMN "email" TYPE text')

    const patients: Array<Record<string, string | null>> =
      await queryRunner.query('SELECT "id", "name", "email", "phone" FROM "patients"')
    for (const row of patients) {
      const name = safeDecrypt(row.name) ?? row.name
      const email = safeDecrypt(row.email) ?? row.email
      const phone = safeDecrypt(row.phone) ?? row.phone
      await queryRunner.query(
        'UPDATE "patients" SET "name"=$1, "email"=$2, "phone"=$3, "emailHash"=$4, "phoneHash"=$5 WHERE "id"=$6',
        [
          enc(name),
          enc(email),
          enc(phone),
          email ? blindIndex(email, 'patient-email') : null,
          phone ? blindIndex(phone.replace(/\D/g, ''), 'patient-phone') : null,
          row.id,
        ],
      )
    }

    const bookings: Array<Record<string, string | null>> =
      await queryRunner.query('SELECT "id", "patientName", "patientEmail", "patientPhone" FROM "bookings"')
    for (const row of bookings) {
      const name = safeDecrypt(row.patientName) ?? row.patientName
      const email = safeDecrypt(row.patientEmail) ?? row.patientEmail
      const phone = safeDecrypt(row.patientPhone) ?? row.patientPhone
      await queryRunner.query(
        'UPDATE "bookings" SET "patientName"=$1, "patientEmail"=$2, "patientPhone"=$3, "patientEmailHash"=$4, "patientPhoneHash"=$5 WHERE "id"=$6',
        [
          enc(name),
          enc(email),
          enc(phone),
          email ? blindIndex(email, 'booking-email') : null,
          phone ? blindIndex(phone.replace(/\D/g, ''), 'booking-phone') : null,
          row.id,
        ],
      )
    }

    const emailLogs: Array<Record<string, string | null>> =
      await queryRunner.query('SELECT "id", "to", "subject", "error" FROM "email_logs"')
    for (const row of emailLogs) {
      const to = safeDecrypt(row.to) ?? row.to
      const subject = safeDecrypt(row.subject) ?? row.subject
      const error = safeDecrypt(row.error) ?? row.error
      await queryRunner.query(
        'UPDATE "email_logs" SET "to"=$1, "toHash"=$2, "subject"=$3, "error"=$4 WHERE "id"=$5',
        [enc(to), to ? blindIndex(to, 'email-log-recipient') : null, enc(subject), enc(error), row.id],
      )
    }

    const attachments: Array<Record<string, string | null>> =
      await queryRunner.query('SELECT "id", "filename" FROM "patient_attachments"')
    for (const row of attachments) {
      await queryRunner.query(
        'UPDATE "patient_attachments" SET "filename"=$1 WHERE "id"=$2',
        [enc(safeDecrypt(row.filename) ?? row.filename), row.id],
      )
    }

    await this.reencryptColumns(queryRunner, 'users', ['phone', 'cpfCnpj'])
    await this.reencryptColumns(queryRunner, 'financial_records', ['description'])
    await this.reencryptColumns(queryRunner, 'appointments', ['notes'])
    await this.reencryptColumns(queryRunner, 'documents', [
      'patientName', 'title', 'signerIp', 'psychologistName',
    ])
    await this.reencryptColumns(queryRunner, 'audit_logs', ['ip', 'userAgent'])

    const suppressions: Array<Record<string, string | null>> =
      await queryRunner.query('SELECT "id", "email" FROM "email_suppressions"')
    for (const row of suppressions) {
      const email = safeDecrypt(row.email) ?? row.email
      await queryRunner.query(
        'UPDATE "email_suppressions" SET "email"=$1, "emailHash"=$2 WHERE "id"=$3',
        [enc(email), email ? blindIndex(email, 'email-suppression') : null, row.id],
      )
    }
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS "UQ_email_suppressions_emailHash" ON "email_suppressions" ("emailHash")')

    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_patients_emailHash_tenant" ON "patients" ("psychologistId", "emailHash")')
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_patients_phoneHash_tenant" ON "patients" ("psychologistId", "phoneHash")')
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_bookings_emailHash_tenant" ON "bookings" ("psychologistId", "patientEmailHash")')
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_bookings_phoneHash_tenant" ON "bookings" ("psychologistId", "patientPhoneHash")')

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "booking_contact_memories" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tokenHash" varchar(64) NOT NULL,
        "patientName" text NOT NULL,
        "patientEmail" text,
        "patientPhone" text,
        "expiresAt" timestamptz NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_booking_contact_memories" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_booking_contact_memories_tokenHash" UNIQUE ("tokenHash")
      )
    `)
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_booking_contact_memories_expiresAt" ON "booking_contact_memories" ("expiresAt")')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "booking_contact_memories"')
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_bookings_phoneHash_tenant"')
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_bookings_emailHash_tenant"')
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_patients_phoneHash_tenant"')
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_patients_emailHash_tenant"')
    await queryRunner.query('ALTER TABLE "bookings" DROP COLUMN IF EXISTS "patientPhoneHash"')
    await queryRunner.query('ALTER TABLE "bookings" DROP COLUMN IF EXISTS "patientEmailHash"')
    await queryRunner.query('ALTER TABLE "patients" DROP COLUMN IF EXISTS "phoneHash"')
    await queryRunner.query('ALTER TABLE "patients" DROP COLUMN IF EXISTS "emailHash"')
    await queryRunner.query('ALTER TABLE "email_logs" DROP COLUMN IF EXISTS "toHash"')
    await queryRunner.query('DROP INDEX IF EXISTS "UQ_email_suppressions_emailHash"')
    await queryRunner.query('ALTER TABLE "email_suppressions" DROP COLUMN IF EXISTS "emailHash"')
  }

  private async reencryptColumns(queryRunner: QueryRunner, table: string, columns: string[]): Promise<void> {
    const select = ['"id"', ...columns.map(column => `"${column}"`)].join(', ')
    const rows: Array<Record<string, string | null>> =
      await queryRunner.query(`SELECT ${select} FROM "${table}"`)
    for (const row of rows) {
      const values = columns.map(column => enc(safeDecrypt(row[column]) ?? row[column]))
      if (values.every(value => value === null)) continue
      const set = columns.map((column, index) => `"${column}"=$${index + 1}`).join(', ')
      await queryRunner.query(
        `UPDATE "${table}" SET ${set} WHERE "id"=$${columns.length + 1}`,
        [...values, row.id],
      )
    }
  }
}
