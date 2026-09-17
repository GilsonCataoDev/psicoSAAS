import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateReferralCommissions1785440000000 implements MigrationInterface {
  name = 'CreateReferralCommissions1785440000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "referrals" ADD COLUMN IF NOT EXISTS "status" character varying(24) NOT NULL DEFAULT 'captured'`)
    await queryRunner.query(`ALTER TABLE "referrals" ADD COLUMN IF NOT EXISTS "firstPaymentId" character varying`)
    await queryRunner.query(`ALTER TABLE "referrals" ADD COLUMN IF NOT EXISTS "firstPaymentGross" numeric(10,2)`)
    await queryRunner.query(`ALTER TABLE "referrals" ADD COLUMN IF NOT EXISTS "commissionAmount" numeric(10,2)`)
    await queryRunner.query(`ALTER TABLE "referrals" ADD COLUMN IF NOT EXISTS "paymentApprovedAt" TIMESTAMP WITH TIME ZONE`)
    await queryRunner.query(`ALTER TABLE "referrals" ADD COLUMN IF NOT EXISTS "commissionAvailableAt" TIMESTAMP WITH TIME ZONE`)
    await queryRunner.query(`ALTER TABLE "referrals" ADD COLUMN IF NOT EXISTS "commissionPaidAt" TIMESTAMP WITH TIME ZONE`)
    await queryRunner.query(`ALTER TABLE "referrals" ADD COLUMN IF NOT EXISTS "payoutReference" character varying(160)`)
    await queryRunner.query(`ALTER TABLE "referrals" ADD COLUMN IF NOT EXISTS "ineligibleReason" character varying(240)`)
    await queryRunner.query(`UPDATE "referrals" SET "status" = 'ineligible', "ineligibleReason" = 'Programa anterior de benefício em dias' WHERE "referredId" IS NOT NULL`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_referrals_referred_payment" ON "referrals" ("referredId", "firstPaymentId")`)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "referral_payout_profiles" (
        "userId" uuid NOT NULL,
        "pixKeyType" character varying(16) NOT NULL,
        "pixKey" text NOT NULL,
        "taxpayerId" text NOT NULL,
        "termsVersion" character varying(20) NOT NULL,
        "termsText" text NOT NULL,
        "termsAcceptedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_referral_payout_profiles" PRIMARY KEY ("userId"),
        CONSTRAINT "FK_referral_payout_profiles_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "referral_payout_profiles"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_referrals_referred_payment"`)
    for (const column of [
      'ineligibleReason', 'payoutReference', 'commissionPaidAt', 'commissionAvailableAt',
      'paymentApprovedAt', 'commissionAmount', 'firstPaymentGross', 'firstPaymentId', 'status',
    ]) {
      await queryRunner.query(`ALTER TABLE "referrals" DROP COLUMN IF EXISTS "${column}"`)
    }
  }
}
