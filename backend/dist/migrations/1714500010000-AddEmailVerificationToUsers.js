"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddEmailVerificationToUsers1714500010000 = void 0;
class AddEmailVerificationToUsers1714500010000 {
    constructor() {
        this.name = 'AddEmailVerificationToUsers1714500010000';
    }
    async up(queryRunner) {
        await queryRunner.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerified" boolean NOT NULL DEFAULT false');
        await queryRunner.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerificationToken" character varying');
        await queryRunner.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerificationExpiry" TIMESTAMP WITH TIME ZONE');
    }
    async down(queryRunner) {
        await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "emailVerificationExpiry"');
        await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "emailVerificationToken"');
        await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "emailVerified"');
    }
}
exports.AddEmailVerificationToUsers1714500010000 = AddEmailVerificationToUsers1714500010000;
//# sourceMappingURL=1714500010000-AddEmailVerificationToUsers.js.map