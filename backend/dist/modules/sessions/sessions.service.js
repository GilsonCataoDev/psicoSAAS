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
var SessionsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const session_entity_1 = require("./entities/session.entity");
const financial_service_1 = require("../financial/financial.service");
const notifications_service_1 = require("../notifications/notifications.service");
const patient_entity_1 = require("../patients/entities/patient.entity");
const user_entity_1 = require("../auth/entities/user.entity");
const encrypt_util_1 = require("../../common/crypto/encrypt.util");
let SessionsService = SessionsService_1 = class SessionsService {
    constructor(repo, patients, users, financial, notifications) {
        this.repo = repo;
        this.patients = patients;
        this.users = users;
        this.financial = financial;
        this.notifications = notifications;
        this.logger = new common_1.Logger(SessionsService_1.name);
    }
    encryptFields(dto) {
        const r = { ...dto };
        if (r.summary)
            r.summary = (0, encrypt_util_1.encrypt)(r.summary);
        if (r.privateNotes)
            r.privateNotes = (0, encrypt_util_1.encrypt)(r.privateNotes);
        if (r.nextSteps)
            r.nextSteps = (0, encrypt_util_1.encrypt)(r.nextSteps);
        return r;
    }
    dec(s) {
        return {
            ...s,
            summary: (0, encrypt_util_1.safeDecrypt)(s.summary),
            privateNotes: (0, encrypt_util_1.safeDecrypt)(s.privateNotes),
            nextSteps: (0, encrypt_util_1.safeDecrypt)(s.nextSteps),
        };
    }
    async findRaw(id, psychologistId) {
        const s = await this.repo.findOne({ where: { id }, relations: ['patient'] });
        if (!s)
            throw new common_1.NotFoundException();
        if (s.psychologistId !== psychologistId)
            throw new common_1.ForbiddenException();
        return s;
    }
    async findAll(psychologistId, patientId) {
        const where = { psychologistId };
        if (patientId)
            where.patientId = patientId;
        const sessions = await this.repo.find({ where, relations: ['patient'], order: { date: 'DESC' } });
        return sessions.map(s => this.dec(s));
    }
    async findOne(id, psychologistId) {
        return this.dec(await this.findRaw(id, psychologistId));
    }
    async create(dto, psychologistId) {
        const encrypted = this.encryptFields(dto);
        const session = this.repo.create({ ...encrypted, psychologistId });
        const saved = await this.repo.save(session);
        if (dto.paymentStatus !== 'waived' && dto.patientId) {
            try {
                const patient = await this.patients.findOne({
                    where: { id: dto.patientId, psychologistId },
                });
                if (patient) {
                    const amount = Number(patient.sessionPrice) || 0;
                    const isPaid = dto.paymentStatus === 'paid';
                    await this.financial.create({
                        type: 'income',
                        amount,
                        description: `Sessão — ${dto.date}`,
                        status: isPaid ? 'paid' : 'pending',
                        dueDate: dto.date,
                        paidAt: isPaid ? dto.date : undefined,
                        method: isPaid ? 'manual' : undefined,
                        sessionId: saved.id,
                        patientId: dto.patientId,
                    }, psychologistId);
                    if (!isPaid && patient.phone) {
                        const user = await this.users.findOneBy({ id: psychologistId });
                        const prefs = (user?.preferences ?? {});
                        if (prefs.autoCharge !== false) {
                            this.notifications.sendPaymentRequest(patient, amount, prefs.pixKey).catch(() => { });
                        }
                    }
                }
            }
            catch (err) {
                this.logger.warn(`Falha ao criar registro financeiro para sessão ${saved.id}: ${err}`);
            }
        }
        return this.dec(saved);
    }
    async update(id, dto, psychologistId) {
        const s = await this.findRaw(id, psychologistId);
        const oldPaymentStatus = s.paymentStatus;
        const encrypted = this.encryptFields(dto);
        Object.assign(s, encrypted);
        const updated = await this.repo.save(s);
        if (dto.paymentStatus && dto.paymentStatus !== oldPaymentStatus) {
            this.syncFinancialRecord(updated, psychologistId).catch(err => this.logger.warn(`Falha ao sincronizar financeiro da sessão ${id}: ${err}`));
        }
        return this.dec(updated);
    }
    async remove(id, psychologistId) {
        const s = await this.findRaw(id, psychologistId);
        await this.repo.remove(s);
        return { deleted: true };
    }
    async syncFinancialRecord(session, psychologistId) {
        const existing = await this.financial.findBySessionId(session.id, psychologistId);
        if (session.paymentStatus === 'waived') {
            if (existing)
                await this.financial.remove(existing.id, psychologistId);
            return;
        }
        if (existing) {
            if (session.paymentStatus === 'paid' && existing.status !== 'paid') {
                await this.financial.markPaid(existing.id, 'manual', psychologistId);
            }
            else if (session.paymentStatus === 'pending' && existing.status === 'paid') {
                await this.financial.resetToPending(existing.id, psychologistId);
            }
        }
        else {
            const patient = await this.patients.findOne({
                where: { id: session.patientId, psychologistId },
            });
            if (!patient)
                return;
            const amount = Number(patient.sessionPrice) || 0;
            const isPaid = session.paymentStatus === 'paid';
            await this.financial.create({
                type: 'income',
                amount,
                description: `Sessão — ${session.date}`,
                status: isPaid ? 'paid' : 'pending',
                dueDate: session.date,
                paidAt: isPaid ? session.date : undefined,
                method: isPaid ? 'manual' : undefined,
                sessionId: session.id,
                patientId: session.patientId,
            }, psychologistId);
        }
    }
    async getDashboard(psychologistId) {
        const allSessions = await this.repo.find({ where: { psychologistId } });
        return {
            sessionsThisMonth: allSessions.length,
            sessionsThisWeek: allSessions.length,
            pendingPayments: allSessions.filter(s => s.paymentStatus === 'pending').length,
            pendingAmount: 0,
        };
    }
};
exports.SessionsService = SessionsService;
exports.SessionsService = SessionsService = SessionsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(session_entity_1.Session)),
    __param(1, (0, typeorm_1.InjectRepository)(patient_entity_1.Patient)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        financial_service_1.FinancialService,
        notifications_service_1.NotificationsService])
], SessionsService);
//# sourceMappingURL=sessions.service.js.map