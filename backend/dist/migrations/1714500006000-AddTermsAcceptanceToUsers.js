"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddTermsAcceptanceToUsers1714500006000 = void 0;
class AddTermsAcceptanceToUsers1714500006000 {
    constructor() {
        this.name = 'AddTermsAcceptanceToUsers1714500006000';
    }
    async up(queryRunner) {
        await queryRunner.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMP WITH TIME ZONE');
        await queryRunner.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "termsVersion" character varying(20)');
    }
    async down(queryRunner) {
        await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "termsVersion"');
        await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "termsAcceptedAt"');
    }
}
exports.AddTermsAcceptanceToUsers1714500006000 = AddTermsAcceptanceToUsers1714500006000;
//# sourceMappingURL=1714500006000-AddTermsAcceptanceToUsers.js.map