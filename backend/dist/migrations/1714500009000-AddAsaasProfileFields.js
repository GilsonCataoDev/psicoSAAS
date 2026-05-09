"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddAsaasProfileFields1714500009000 = void 0;
class AddAsaasProfileFields1714500009000 {
    constructor() {
        this.name = 'AddAsaasProfileFields1714500009000';
    }
    async up(queryRunner) {
        await queryRunner.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "cpfCnpj" character varying');
        await queryRunner.query('ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "cpfCnpj" character varying');
        await queryRunner.query('ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "asaasCustomerId" character varying');
    }
    async down(queryRunner) {
        await queryRunner.query('ALTER TABLE "patients" DROP COLUMN IF EXISTS "asaasCustomerId"');
        await queryRunner.query('ALTER TABLE "patients" DROP COLUMN IF EXISTS "cpfCnpj"');
        await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "cpfCnpj"');
    }
}
exports.AddAsaasProfileFields1714500009000 = AddAsaasProfileFields1714500009000;
//# sourceMappingURL=1714500009000-AddAsaasProfileFields.js.map