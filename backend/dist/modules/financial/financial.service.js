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
exports.FinancialService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const financial_record_entity_1 = require("./entities/financial-record.entity");
let FinancialService = class FinancialService {
    constructor(repo) {
        this.repo = repo;
    }
    findAll(psychologistId, status) {
        const where = { psychologistId };
        if (status)
            where.status = status;
        return this.repo.find({ where, relations: ['patient'], order: { createdAt: 'DESC' } });
    }
    async findOne(id, psychologistId) {
        const r = await this.repo.findOne({ where: { id } });
        if (!r)
            throw new common_1.NotFoundException();
        if (r.psychologistId !== psychologistId)
            throw new common_1.ForbiddenException();
        return r;
    }
    create(dto, psychologistId) {
        const record = this.repo.create({ ...dto, psychologistId });
        return this.repo.save(record);
    }
    async markPaid(id, method, psychologistId) {
        const r = await this.findOne(id, psychologistId);
        r.status = 'paid';
        r.paidAt = new Date().toISOString();
        r.method = method;
        return this.repo.save(r);
    }
    async getSummary(psychologistId) {
        const records = await this.repo.find({ where: { psychologistId } });
        const income = records.filter(r => r.type === 'income');
        return {
            totalRevenue: income.reduce((s, r) => s + Number(r.amount), 0),
            paid: income.filter(r => r.status === 'paid').reduce((s, r) => s + Number(r.amount), 0),
            pending: income.filter(r => r.status === 'pending').reduce((s, r) => s + Number(r.amount), 0),
            overdue: income.filter(r => r.status === 'overdue').reduce((s, r) => s + Number(r.amount), 0),
        };
    }
};
exports.FinancialService = FinancialService;
exports.FinancialService = FinancialService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(financial_record_entity_1.FinancialRecord)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], FinancialService);
//# sourceMappingURL=financial.service.js.map