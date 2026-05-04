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
exports.DataExportService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const encrypt_util_1 = require("../../common/crypto/encrypt.util");
const user_entity_1 = require("../auth/entities/user.entity");
const patient_entity_1 = require("../patients/entities/patient.entity");
const appointment_entity_1 = require("../appointments/entities/appointment.entity");
const session_entity_1 = require("../sessions/entities/session.entity");
const financial_record_entity_1 = require("../financial/entities/financial-record.entity");
const document_entity_1 = require("../documents/entities/document.entity");
const availability_slot_entity_1 = require("../availability/entities/availability-slot.entity");
const blocked_date_entity_1 = require("../availability/entities/blocked-date.entity");
const booking_page_entity_1 = require("../booking/entities/booking-page.entity");
const booking_entity_1 = require("../booking/entities/booking.entity");
const subscription_entity_1 = require("../billing/entities/subscription.entity");
let DataExportService = class DataExportService {
    constructor(users, patients, appointments, sessions, financial, documents, availability, blockedDates, bookingPages, bookings, subscriptions) {
        this.users = users;
        this.patients = patients;
        this.appointments = appointments;
        this.sessions = sessions;
        this.financial = financial;
        this.documents = documents;
        this.availability = availability;
        this.blockedDates = blockedDates;
        this.bookingPages = bookingPages;
        this.bookings = bookings;
        this.subscriptions = subscriptions;
    }
    async buildExport(userId) {
        const user = await this.users.findOne({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('Usuario nao encontrado');
        const [patients, appointments, sessions, financialRecords, documents, availabilitySlots, blockedDates, bookingPage, bookings, subscriptions,] = await Promise.all([
            this.patients.find({ where: { psychologistId: userId }, order: { name: 'ASC' } }),
            this.appointments.find({ where: { psychologistId: userId }, order: { date: 'ASC', time: 'ASC' } }),
            this.sessions.find({ where: { psychologistId: userId }, order: { date: 'DESC' } }),
            this.financial.find({ where: { psychologistId: userId }, order: { createdAt: 'DESC' } }),
            this.documents.find({ where: { userId }, order: { createdAt: 'DESC' } }),
            this.availability.find({ where: { psychologistId: userId }, order: { weekday: 'ASC', startTime: 'ASC' } }),
            this.blockedDates.find({ where: { psychologistId: userId }, order: { date: 'ASC' } }),
            this.bookingPages.findOne({ where: { psychologistId: userId } }),
            this.bookings.find({ where: { psychologistId: userId }, order: { date: 'DESC', time: 'DESC' } }),
            this.subscriptions.find({ where: { userId }, order: { createdAt: 'DESC' } }),
        ]);
        return {
            format: 'usecognia.data-export.v1',
            exportedAt: new Date().toISOString(),
            owner: this.cleanUser(user),
            subscription: subscriptions.map(this.cleanSubscription),
            patients: patients.map((patient) => this.cleanPatient(patient)),
            appointments,
            sessions: sessions.map((session) => this.cleanSession(session)),
            financialRecords,
            documents: documents.map(this.cleanDocument),
            availability: {
                weeklySlots: availabilitySlots,
                blockedDates,
            },
            publicBooking: {
                page: bookingPage,
                requests: bookings,
            },
        };
    }
    cleanUser(user) {
        const { passwordHash, resetPasswordToken, resetPasswordExpiry, ...safeUser } = user;
        void passwordHash;
        void resetPasswordToken;
        void resetPasswordExpiry;
        return safeUser;
    }
    cleanSubscription(subscription) {
        const { gatewayCustomerId, gatewaySubscriptionId, ...safeSubscription } = subscription;
        void gatewayCustomerId;
        void gatewaySubscriptionId;
        return safeSubscription;
    }
    cleanPatient(patient) {
        return {
            ...patient,
            privateNotes: (0, encrypt_util_1.safeDecrypt)(patient.privateNotes),
            prontuario: this.decryptProntuario(patient.prontuario),
        };
    }
    cleanSession(session) {
        return {
            ...session,
            summary: (0, encrypt_util_1.safeDecrypt)(session.summary),
            privateNotes: (0, encrypt_util_1.safeDecrypt)(session.privateNotes),
            nextSteps: (0, encrypt_util_1.safeDecrypt)(session.nextSteps),
        };
    }
    cleanDocument(document) {
        const { signHash, signerIp, ...safeDocument } = document;
        void signHash;
        void signerIp;
        return safeDocument;
    }
    decryptProntuario(value) {
        const encrypted = value;
        if (encrypted
            && encrypted.__encrypted === 'psicosaas.prontuario.v1'
            && typeof encrypted.data === 'string') {
            try {
                return JSON.parse((0, encrypt_util_1.safeDecrypt)(encrypted.data) ?? '{}');
            }
            catch {
                return {};
            }
        }
        return value;
    }
};
exports.DataExportService = DataExportService;
exports.DataExportService = DataExportService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(patient_entity_1.Patient)),
    __param(2, (0, typeorm_1.InjectRepository)(appointment_entity_1.Appointment)),
    __param(3, (0, typeorm_1.InjectRepository)(session_entity_1.Session)),
    __param(4, (0, typeorm_1.InjectRepository)(financial_record_entity_1.FinancialRecord)),
    __param(5, (0, typeorm_1.InjectRepository)(document_entity_1.Document)),
    __param(6, (0, typeorm_1.InjectRepository)(availability_slot_entity_1.AvailabilitySlot)),
    __param(7, (0, typeorm_1.InjectRepository)(blocked_date_entity_1.BlockedDate)),
    __param(8, (0, typeorm_1.InjectRepository)(booking_page_entity_1.BookingPage)),
    __param(9, (0, typeorm_1.InjectRepository)(booking_entity_1.Booking)),
    __param(10, (0, typeorm_1.InjectRepository)(subscription_entity_1.Subscription)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], DataExportService);
//# sourceMappingURL=data-export.service.js.map