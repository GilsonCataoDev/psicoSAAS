import { MigrationInterface, QueryRunner } from 'typeorm'
import { decrypt, encrypt, hashToken } from '../common/crypto/encrypt.util'

function encrypted(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    decrypt(value)
    return value
  } catch {
    return encrypt(value)
  }
}

function plaintext(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    return decrypt(value)
  } catch {
    return value
  }
}

export class ProtectPublicTokensAndSensitiveLogs1784590000000 implements MigrationInterface {
  name = 'ProtectPublicTokensAndSensitiveLogs1784590000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "confirmationTokenEncrypted" text')
    await queryRunner.query('ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "cancellationCodeEncrypted" text')
    await queryRunner.query('ALTER TABLE "instrument_assignments" ADD COLUMN IF NOT EXISTS "tokenEncrypted" text')

    const bookings: Array<{ id: string; confirmationToken: string; cancellationCode: string | null }> =
      await queryRunner.query('SELECT "id", "confirmationToken", "cancellationCode" FROM "bookings"')
    for (const booking of bookings) {
      await queryRunner.query(
        `UPDATE "bookings"
         SET "confirmationToken" = $1,
             "confirmationTokenEncrypted" = $2,
             "cancellationCode" = $3,
             "cancellationCodeEncrypted" = $4
         WHERE "id" = $5`,
        [
          hashToken(booking.confirmationToken),
          encrypt(booking.confirmationToken),
          booking.cancellationCode ? hashToken(booking.cancellationCode) : null,
          booking.cancellationCode ? encrypt(booking.cancellationCode) : null,
          booking.id,
        ],
      )
    }

    const assignments: Array<{ id: string; token: string }> =
      await queryRunner.query('SELECT "id", "token" FROM "instrument_assignments"')
    for (const assignment of assignments) {
      await queryRunner.query(
        'UPDATE "instrument_assignments" SET "token" = $1, "tokenEncrypted" = $2 WHERE "id" = $3',
        [hashToken(assignment.token), encrypt(assignment.token), assignment.id],
      )
    }

    const bookingNotes: Array<{ id: string; patientNotes: string | null; cancellationReason: string | null }> =
      await queryRunner.query('SELECT "id", "patientNotes", "cancellationReason" FROM "bookings" WHERE "patientNotes" IS NOT NULL OR "cancellationReason" IS NOT NULL')
    for (const row of bookingNotes) {
      await queryRunner.query(
        'UPDATE "bookings" SET "patientNotes" = $1, "cancellationReason" = $2 WHERE "id" = $3',
        [encrypted(row.patientNotes), encrypted(row.cancellationReason), row.id],
      )
    }

    const scoreDetails: Array<{ id: string; scoreDetails: string | null }> =
      await queryRunner.query('SELECT "id", "scoreDetails" FROM "instrument_assignments" WHERE "scoreDetails" IS NOT NULL')
    for (const row of scoreDetails) {
      await queryRunner.query('UPDATE "instrument_assignments" SET "scoreDetails" = $1 WHERE "id" = $2', [encrypted(row.scoreDetails), row.id])
    }

    const logs: Array<{ id: string; patientName: string | null; recipientPhone: string | null; error: string | null }> =
      await queryRunner.query('SELECT "id", "patientName", "recipientPhone", "error" FROM "whatsapp_delivery_logs"')
    for (const log of logs) {
      await queryRunner.query(
        'UPDATE "whatsapp_delivery_logs" SET "patientName" = $1, "recipientPhone" = $2, "error" = $3 WHERE "id" = $4',
        [encrypted(log.patientName), encrypted(log.recipientPhone), encrypted(log.error), log.id],
      )
    }

    await queryRunner.query('DELETE FROM "whatsapp_delivery_logs" WHERE "createdAt" < NOW() - INTERVAL \'7 days\'')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const bookings: Array<{ id: string; confirmationTokenEncrypted: string | null; cancellationCodeEncrypted: string | null; patientNotes: string | null; cancellationReason: string | null }> =
      await queryRunner.query('SELECT "id", "confirmationTokenEncrypted", "cancellationCodeEncrypted", "patientNotes", "cancellationReason" FROM "bookings"')
    for (const booking of bookings) {
      const confirmationToken = plaintext(booking.confirmationTokenEncrypted)
      if (!confirmationToken) continue
      await queryRunner.query(
        'UPDATE "bookings" SET "confirmationToken" = $1, "cancellationCode" = $2, "patientNotes" = $3, "cancellationReason" = $4 WHERE "id" = $5',
        [confirmationToken, plaintext(booking.cancellationCodeEncrypted), plaintext(booking.patientNotes), plaintext(booking.cancellationReason), booking.id],
      )
    }

    const assignments: Array<{ id: string; tokenEncrypted: string | null; scoreDetails: string | null }> =
      await queryRunner.query('SELECT "id", "tokenEncrypted", "scoreDetails" FROM "instrument_assignments"')
    for (const assignment of assignments) {
      const token = plaintext(assignment.tokenEncrypted)
      if (!token) continue
      await queryRunner.query(
        'UPDATE "instrument_assignments" SET "token" = $1, "scoreDetails" = $2 WHERE "id" = $3',
        [token, plaintext(assignment.scoreDetails), assignment.id],
      )
    }

    const logs: Array<{ id: string; patientName: string | null; recipientPhone: string | null; error: string | null }> =
      await queryRunner.query('SELECT "id", "patientName", "recipientPhone", "error" FROM "whatsapp_delivery_logs"')
    for (const log of logs) {
      await queryRunner.query(
        'UPDATE "whatsapp_delivery_logs" SET "patientName" = $1, "recipientPhone" = $2, "error" = $3 WHERE "id" = $4',
        [plaintext(log.patientName), plaintext(log.recipientPhone), plaintext(log.error), log.id],
      )
    }

    await queryRunner.query('ALTER TABLE "instrument_assignments" DROP COLUMN IF EXISTS "tokenEncrypted"')
    await queryRunner.query('ALTER TABLE "bookings" DROP COLUMN IF EXISTS "cancellationCodeEncrypted"')
    await queryRunner.query('ALTER TABLE "bookings" DROP COLUMN IF EXISTS "confirmationTokenEncrypted"')
  }
}
