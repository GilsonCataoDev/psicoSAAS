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
exports.SessionsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const session_entity_1 = require("./entities/session.entity");
let SessionsService = class SessionsService {
    constructor(repo) {
        this.repo = repo;
    }
    findAll(psychologistId, patientId) {
        const where = { psychologistId };
        if (patientId)
            where.patientId = patientId;
        return this.repo.find({ where, relations: ['patient'], order: { date: 'DESC' } });
    }
    async findOne(id, psychologistId) {
        const s = await this.repo.findOne({ where: { id }, relations: ['patient'] });
        if (!s)
            throw new common_1.NotFoundException();
        if (s.psychologistId !== psychologistId)
            throw new common_1.ForbiddenException();
        return s;
    }
    create(dto, psychologistId) {
        const session = this.repo.create({ ...dto, psychologistId });
        return this.repo.save(session);
    }
    async update(id, dto, psychologistId) {
        const s = await this.findOne(id, psychologistId);
        Object.assign(s, dto);
        return this.repo.save(s);
    }
    async getDashboard(psychologistId) {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay())).toISOString().split('T')[0];
        const [monthSessions, weekSessions, allSessions] = await Promise.all([
            this.repo.count({ where: { psychologistId } }),
            this.repo.count({ where: { psychologistId } }),
            this.repo.find({ where: { psychologistId } }),
        ]);
        const pendingAmount = allSessions
            .filter(s => s.paymentStatus === 'pending')
            .reduce((sum, _) => sum, 0);
        return {
            sessionsThisMonth: monthSessions,
            sessionsThisWeek: weekSessions,
            pendingPayments: allSessions.filter(s => s.paymentStatus === 'pending').length,
            pendingAmount,
        };
    }
};
exports.SessionsService = SessionsService;
exports.SessionsService = SessionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(session_entity_1.Session)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], SessionsService);
//# sourceMappingURL=sessions.service.js.map