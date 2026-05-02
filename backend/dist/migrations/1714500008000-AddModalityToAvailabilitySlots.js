"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddModalityToAvailabilitySlots1714500008000 = void 0;
class AddModalityToAvailabilitySlots1714500008000 {
    constructor() {
        this.name = 'AddModalityToAvailabilitySlots1714500008000';
    }
    async up(queryRunner) {
        await queryRunner.query('ALTER TABLE "availability_slots" ADD COLUMN IF NOT EXISTS "modality" character varying NOT NULL DEFAULT \'online\'');
    }
    async down(queryRunner) {
        await queryRunner.query('ALTER TABLE "availability_slots" DROP COLUMN IF EXISTS "modality"');
    }
}
exports.AddModalityToAvailabilitySlots1714500008000 = AddModalityToAvailabilitySlots1714500008000;
//# sourceMappingURL=1714500008000-AddModalityToAvailabilitySlots.js.map