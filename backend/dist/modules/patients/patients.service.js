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
exports.PatientsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const patient_entity_1 = require("./entities/patient.entity");
const subscription_entity_1 = require("../subscriptions/entities/subscription.entity");
const plan_guard_1 = require("../../common/guards/plan.guard");
let PatientsService = class PatientsService {
    constructor(repo, subs) {
        this.repo = repo;
        this.subs = subs;
    }
    async checkPatientLimit(userId) {
        const sub = await this.subs.findOne({ where: { userId } });
        const plan = (sub?.status === 'active' || sub?.status === 'trialing')
            ? sub.planId
            : 'free';
        const limit = plan_guard_1.PLAN_LIMITS[plan]?.maxPatients ?? 2;
        if (limit === -1)
            return;
        const count = await this.repo.count({ where: { psychologistId: userId, status: 'active' } });
        if (count >= limit) {
            throw new common_1.ForbiddenException({
                message: `Limite de ${limit} pessoa${limit !== 1 ? 's' : ''} atingido para o plano ${plan}. Faça upgrade para adicionar mais.`,
                upgradeUrl: '/planos',
                currentPlan: plan,
            });
        }
    }
    findAll(psychologistId) {
        return this.repo.find({
            where: { psychologistId },
            order: { name: 'ASC' },
        });
    }
    async findOne(id, psychologistId) {
        const patient = await this.repo.findOne({ where: { id }, relations: ['sessions', 'appointments'] });
        if (!patient)
            throw new common_1.NotFoundException('Pessoa não encontrada');
        if (patient.psychologistId !== psychologistId)
            throw new common_1.ForbiddenException();
        return patient;
    }
    async create(dto, psychologistId) {
        await this.checkPatientLimit(psychologistId);
        const patient = this.repo.create({ ...dto, psychologistId });
        return this.repo.save(patient);
    }
    async update(id, dto, psychologistId) {
        const patient = await this.findOne(id, psychologistId);
        Object.assign(patient, dto);
        return this.repo.save(patient);
    }
    async remove(id, psychologistId) {
        const patient = await this.findOne(id, psychologistId);
        return this.repo.softRemove(patient);
    }
};
exports.PatientsService = PatientsService;
exports.PatientsService = PatientsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(patient_entity_1.Patient)),
    __param(1, (0, typeorm_1.InjectRepository)(subscription_entity_1.Subscription)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], PatientsService);
//# sourceMappingURL=patients.service.js.map