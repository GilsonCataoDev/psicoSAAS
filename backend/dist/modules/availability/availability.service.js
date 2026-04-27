"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvailabilityService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const availability_slot_entity_1 = require("./entities/availability-slot.entity");
const blocked_date_entity_1 = require("./entities/blocked-date.entity");
let AvailabilityService = class AvailabilityService {
    constructor(slots, blocked) {
        this.slots = slots;
        this.blocked = blocked;
    }
    findAll(psychologistId) {
        return this.slots.find({ where: { psychologistId, isActive: true }, order: { weekday: 'ASC', startTime: 'ASC' } });
    }
    getSlotsForDay(psychologistId, weekday) {
        return this.slots.find({ where: { psychologistId, weekday, isActive: true } });
    }
    async isDateBlocked(psychologistId, date) {
        const b = await this.blocked.findOne({ where: { psychologistId, date } });
        return !!b;
    }
    async saveSlots(psychologistId, slotsData) {
        await this.slots.delete({ psychologistId });
        const newSlots = slotsData.map(s => this.slots.create({ ...s, psychologistId }));
        return this.slots.save(newSlots);
    }
    getBlockedDates(psychologistId) {
        return this.blocked.find({ where: { psychologistId }, order: { date: 'ASC' } });
    }
    addBlockedDate(psychologistId, date, reason) {
        const b = this.blocked.create({ psychologistId, date, reason });
        return this.blocked.save(b);
    }
    async removeBlockedDate(id, psychologistId) {
        await this.blocked.delete({ id, psychologistId });
    }
};
exports.AvailabilityService = AvailabilityService;
exports.AvailabilityService = AvailabilityService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(availability_slot_entity_1.AvailabilitySlot)),
    __param(1, (0, typeorm_1.InjectRepository)(blocked_date_entity_1.BlockedDate)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], AvailabilityService);
//# sourceMappingURL=availability.service.js.map