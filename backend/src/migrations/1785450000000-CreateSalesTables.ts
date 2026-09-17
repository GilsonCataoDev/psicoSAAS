import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateSalesTables1785450000000 implements MigrationInterface {
  name = 'CreateSalesTables1785450000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "sales_reps" (
        "id"               uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name"             character varying(200) NOT NULL,
        "email"            character varying(200) NOT NULL,
        "phone"            character varying(30),
        "pixKey"           text NOT NULL,
        "pixKeyType"       character varying(16) NOT NULL,
        "couponCode"       character varying(20) NOT NULL,
        "accessToken"      uuid NOT NULL DEFAULT uuid_generate_v4(),
        "commissionAmount" numeric(10,2) NOT NULL DEFAULT 48.95,
        "status"           character varying(8) NOT NULL DEFAULT 'active',
        "createdAt"        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt"        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sales_reps" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_sales_reps_email" UNIQUE ("email"),
        CONSTRAINT "UQ_sales_reps_couponCode" UNIQUE ("couponCode"),
        CONSTRAINT "UQ_sales_reps_accessToken" UNIQUE ("accessToken"),
        CONSTRAINT "CK_sales_reps_pixKeyType" CHECK ("pixKeyType" IN ('cpf','cnpj','email','phone','random')),
        CONSTRAINT "CK_sales_reps_status" CHECK ("status" IN ('active','inactive'))
      )
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_sales_reps_couponCode" ON "sales_reps" ("couponCode")
    `)

    await queryRunner.query(`
      CREATE TABLE "sales_commissions" (
        "id"                      uuid NOT NULL DEFAULT uuid_generate_v4(),
        "salesRepId"              uuid,
        "userId"                  uuid,
        "couponCode"              character varying(20) NOT NULL,
        "paymentId"               character varying(200),
        "grossAmount"             numeric(10,2),
        "commissionAmount"        numeric(10,2) NOT NULL,
        "status"                  character varying(20) NOT NULL DEFAULT 'pending',
        "paymentApprovedAt"       TIMESTAMP WITH TIME ZONE,
        "commissionAvailableAt"   TIMESTAMP WITH TIME ZONE,
        "commissionPaidAt"        TIMESTAMP WITH TIME ZONE,
        "payoutReference"         character varying(160),
        "ineligibleReason"        character varying(240),
        "createdAt"               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt"               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sales_commissions" PRIMARY KEY ("id"),
        CONSTRAINT "CK_sales_commissions_status" CHECK ("status" IN ('pending','validating','payable','paid','refunded','chargeback')),
        CONSTRAINT "FK_sales_commissions_salesRep" FOREIGN KEY ("salesRepId")
          REFERENCES "sales_reps"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_sales_commissions_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_sales_commissions_salesRepId" ON "sales_commissions" ("salesRepId")
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_sales_commissions_userId" ON "sales_commissions" ("userId")
    `)

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "salesCouponCode" character varying(20)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "salesCouponCode"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "sales_commissions"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "sales_reps"`)
  }
}
