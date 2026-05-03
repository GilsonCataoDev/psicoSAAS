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
var AnalyticsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const date_fns_1 = require("date-fns");
const patient_entity_1 = require("../patients/entities/patient.entity");
const appointment_entity_1 = require("../appointments/entities/appointment.entity");
const financial_record_entity_1 = require("../financial/entities/financial-record.entity");
const PT_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
async function safe(label, logger, fn, fallback) {
    try {
        return await fn();
    }
    catch (err) {
        logger.error(`[dashboard] query "${label}" falhou: ${err?.message ?? err}`);
        return fallback;
    }
}
let AnalyticsService = AnalyticsService_1 = class AnalyticsService {
    constructor(patients, appointments, financial) {
        this.patients = patients;
        this.appointments = appointments;
        this.financial = financial;
        this.logger = new common_1.Logger(AnalyticsService_1.name);
    }
    async getDashboardStats(userId) {
        this.logger.log(`getDashboardStats userId=${userId}`);
        const now = new Date();
        const today = (0, date_fns_1.format)(now, 'yyyy-MM-dd');
        const monthStart = (0, date_fns_1.format)((0, date_fns_1.startOfMonth)(now), 'yyyy-MM-dd');
        const monthEnd = (0, date_fns_1.format)((0, date_fns_1.endOfMonth)(now), 'yyyy-MM-dd');
        const weekStart = (0, date_fns_1.format)((0, date_fns_1.startOfWeek)(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const weekEnd = (0, date_fns_1.format)((0, date_fns_1.endOfWeek)(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const thirtyDaysAgo = (0, date_fns_1.format)((0, date_fns_1.subMonths)(now, 1), 'yyyy-MM-dd');
        const log = this.logger;
        const [activePatients, sessionsThisMonth, sessionsThisWeek, todayAppointments, pendingPayments, monthRevenue, revenueChart, inactivePatients,] = await Promise.all([
            safe('activePatients', log, () => this.patients
                .createQueryBuilder('p')
                .where('p.psychologistId = :userId', { userId })
                .andWhere("(p.status IS NULL OR p.status NOT IN ('paused', 'discharged'))")
                .getCount(), 0),
            safe('sessionsThisMonth', log, () => this.appointments
                .createQueryBuilder('a')
                .where('a.psychologistId = :userId', { userId })
                .andWhere('a.status = :status', { status: 'completed' })
                .andWhere('a.date BETWEEN :start AND :end', { start: monthStart, end: monthEnd })
                .getCount(), 0),
            safe('sessionsThisWeek', log, () => this.appointments
                .createQueryBuilder('a')
                .where('a.psychologistId = :userId', { userId })
                .andWhere('a.status = :status', { status: 'completed' })
                .andWhere('a.date BETWEEN :start AND :end', { start: weekStart, end: weekEnd })
                .getCount(), 0),
            safe('todayAppointments', log, () => this.appointments.find({
                where: { psychologistId: userId, date: today },
                relations: ['patient'],
                order: { time: 'ASC' },
            }), []),
            safe('pendingPayments', log, () => this.financial
                .createQueryBuilder('f')
                .where('f.psychologistId = :userId', { userId })
                .andWhere('f.status IN (:...statuses)', { statuses: ['pending', 'overdue'] })
                .andWhere("(f.type IS NULL OR f.type = 'income')")
                .orderBy('f.dueDate', 'ASC', 'NULLS LAST')
                .take(10)
                .getMany(), []),
            safe('monthRevenue', log, () => this.financial
                .createQueryBuilder('f')
                .select('SUM(f.amount)', 'total')
                .where('f.psychologistId = :userId', { userId })
                .andWhere('f.type = :type', { type: 'income' })
                .andWhere('f.status = :status', { status: 'paid' })
                .andWhere('f.paidAt BETWEEN :start AND :end', { start: monthStart, end: monthEnd })
                .getRawOne(), null),
            safe('revenueChart', log, () => Promise.all(Array.from({ length: 6 }, (_, i) => {
                const d = (0, date_fns_1.subMonths)(now, 5 - i);
                const mStart = (0, date_fns_1.format)((0, date_fns_1.startOfMonth)(d), 'yyyy-MM-dd');
                const mEnd = (0, date_fns_1.format)((0, date_fns_1.endOfMonth)(d), 'yyyy-MM-dd');
                const label = PT_MONTHS[d.getMonth()];
                return this.financial
                    .createQueryBuilder('f')
                    .select('SUM(f.amount)', 'total')
                    .where('f.psychologistId = :userId', { userId })
                    .andWhere('f.type = :type', { type: 'income' })
                    .andWhere('f.status = :status', { status: 'paid' })
                    .andWhere('f.paidAt BETWEEN :start AND :end', { start: mStart, end: mEnd })
                    .getRawOne()
                    .then(r => ({ mes: label, valor: Number(r?.total ?? 0) }));
            })), []),
            safe('inactivePatients', log, () => this.patients
                .createQueryBuilder('p')
                .where('p.psychologistId = :userId', { userId })
                .andWhere("(p.status IS NULL OR p.status NOT IN ('paused', 'discharged'))")
                .andWhere(`COALESCE((
            SELECT MAX(a.date) FROM appointments a
            WHERE a."patientId" = p.id AND a.status = 'completed'
          ), '1970-01-01') < :thirtyDaysAgo`, { thirtyDaysAgo })
                .getCount(), 0),
        ]);
        this.logger.log(`dashboard OK: active=${activePatients} sessMonth=${sessionsThisMonth} pending=${pendingPayments.length}`);
        return {
            activePatients,
            sessionsThisMonth,
            sessionsThisWeek,
            monthRevenue: Number(monthRevenue?.total ?? 0),
            pendingPayments: pendingPayments.length,
            pendingAmount: pendingPayments.reduce((s, p) => s + Number(p.amount), 0),
            inactivePatients,
            todayAppointments,
            revenueChart,
        };
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = AnalyticsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(patient_entity_1.Patient)),
    __param(1, (0, typeorm_1.InjectRepository)(appointment_entity_1.Appointment)),
    __param(2, (0, typeorm_1.InjectRepository)(financial_record_entity_1.FinancialRecord)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map