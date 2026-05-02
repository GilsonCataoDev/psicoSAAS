"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddModalityToBookings1714500007000 = void 0;
class AddModalityToBookings1714500007000 {
    constructor() {
        this.name = 'AddModalityToBookings1714500007000';
    }
    async up(queryRunner) {
        await queryRunner.query('ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "modality" character varying NOT NULL DEFAULT \'online\'');
    }
    async down(queryRunner) {
        await queryRunner.query('ALTER TABLE "bookings" DROP COLUMN IF EXISTS "modality"');
    }
}
exports.AddModalityToBookings1714500007000 = AddModalityToBookings1714500007000;
//# sourceMappingURL=1714500007000-AddModalityToBookings.js.map