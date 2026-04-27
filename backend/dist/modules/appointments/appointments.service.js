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
exports.AppointmentsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const appointment_entity_1 = require("./entities/appointment.entity");
const notifications_service_1 = require("../notifications/notifications.service");
let AppointmentsService = class AppointmentsService {
    constructor(repo, notifications) {
        this.repo = repo;
        this.notifications = notifications;
    }
    findAll(psychologistId, dateFrom, dateTo) {
        const where = { psychologistId };
        if (dateFrom && dateTo)
            where.date = (0, typeorm_2.Between)(dateFrom, dateTo);
        return this.repo.find({ where, relations: ['patient'], order: { date: 'ASC', time: 'ASC' } });
    }
    async findOne(id, psychologistId) {
        const a = await this.repo.findOne({ where: { id }, relations: ['patient'] });
        if (!a)
            throw new common_1.NotFoundException();
        if (a.psychologistId !== psychologistId)
            throw new common_1.ForbiddenException();
        return a;
    }
    async create(dto, psychologistId) {
        const appointment = this.repo.create({ ...dto, psychologistId });
        const saved = await this.repo.save(appointment);
        this.notifications.scheduleReminder(saved).catch(console.error);
        return saved;
    }
    async updateStatus(id, status, psychologistId) {
        const a = await this.findOne(id, psychologistId);
        a.status = status;
        return this.repo.save(a);
    }
    async remove(id, psychologistId) {
        const a = await this.findOne(id, psychologistId);
        return this.repo.remove(a);
    }
};
exports.AppointmentsService = AppointmentsService;
exports.AppointmentsService = AppointmentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(appointment_entity_1.Appointment)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        notifications_service_1.NotificationsService])
], AppointmentsService);
//# sourceMappingURL=appointments.service.js.map