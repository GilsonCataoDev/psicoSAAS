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
exports.BookingService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crypto_1 = require("crypto");
const date_fns_1 = require("date-fns");
const booking_entity_1 = require("./entities/booking.entity");
const booking_page_entity_1 = require("./entities/booking-page.entity");
const availability_service_1 = require("../availability/availability.service");
const notifications_service_1 = require("../notifications/notifications.service");
let BookingService = class BookingService {
    constructor(bookings, pages, availability, notifications) {
        this.bookings = bookings;
        this.pages = pages;
        this.availability = availability;
        this.notifications = notifications;
    }
    async getPublicPage(slug) {
        const page = await this.pages.findOne({
            where: { slug, isActive: true },
            relations: ['psychologist'],
        });
        if (!page)
            throw new common_1.NotFoundException('Página de agendamento não encontrada');
        const { psychologist, ...pageData } = page;
        return {
            ...pageData,
            psychologistName: psychologist.name,
            psychologistCrp: psychologist.crp,
            specialty: psychologist.specialty,
        };
    }
    async getAvailableSlots(slug, dateStr) {
        const page = await this.pages.findOne({ where: { slug, isActive: true } });
        if (!page)
            throw new common_1.NotFoundException();
        const date = (0, date_fns_1.parseISO)(dateStr);
        const weekday = (0, date_fns_1.getDay)(date);
        const slots = await this.availability.getSlotsForDay(page.psychologistId, weekday);
        if (!slots.length)
            return [];
        const isBlocked = await this.availability.isDateBlocked(page.psychologistId, dateStr);
        if (isBlocked)
            return [];
        const minDate = (0, date_fns_1.addDays)(new Date(), page.minAdvanceDays);
        const maxDate = (0, date_fns_1.addDays)(new Date(), page.maxAdvanceDays);
        if ((0, date_fns_1.isBefore)(date, minDate) || (0, date_fns_1.isAfter)(date, maxDate))
            return [];
        const existing = await this.bookings.find({
            where: {
                psychologistId: page.psychologistId,
                date: dateStr,
                status: 'confirmed',
            },
        });
        const occupiedTimes = new Set(existing.map(b => b.time));
        const available = [];
        for (const slot of slots) {
            const [startH, startM] = slot.startTime.split(':').map(Number);
            const [endH, endM] = slot.endTime.split(':').map(Number);
            let current = (0, date_fns_1.setMinutes)((0, date_fns_1.setHours)(date, startH), startM);
            const end = (0, date_fns_1.setMinutes)((0, date_fns_1.setHours)(date, endH), endM);
            while ((0, date_fns_1.isBefore)((0, date_fns_1.addMinutes)(current, page.sessionDuration), end)
                || +(0, date_fns_1.addMinutes)(current, page.sessionDuration) === +end) {
                const timeStr = (0, date_fns_1.format)(current, 'HH:mm');
                if (!occupiedTimes.has(timeStr)) {
                    available.push(timeStr);
                }
                current = (0, date_fns_1.addMinutes)(current, page.slotInterval);
            }
        }
        return available;
    }
    async createBooking(slug, dto) {
        const page = await this.pages.findOne({
            where: { slug, isActive: true },
            relations: ['psychologist'],
        });
        if (!page)
            throw new common_1.NotFoundException();
        const conflict = await this.bookings.findOne({
            where: {
                psychologistId: page.psychologistId,
                date: dto.date,
                time: dto.time,
                status: 'confirmed',
            },
        });
        if (conflict)
            throw new common_1.ConflictException('Este horário não está mais disponível');
        const confirmationToken = (0, crypto_1.randomBytes)(32).toString('hex');
        const tokenExpiresAt = (0, date_fns_1.addDays)(new Date(), 2);
        const booking = this.bookings.create({
            ...dto,
            psychologistId: page.psychologistId,
            duration: page.sessionDuration,
            amount: page.sessionPrice,
            confirmationToken,
            tokenExpiresAt,
            status: 'pending',
            paymentStatus: 'pending',
        });
        const saved = await this.bookings.save(booking);
        await this.notifications.sendBookingRequest(saved, page);
        return {
            id: saved.id,
            confirmationToken: saved.confirmationToken,
            message: 'Solicitação recebida! Aguarde a confirmação do psicólogo.',
        };
    }
    async confirmByToken(token) {
        const booking = await this.bookings.findOne({
            where: { confirmationToken: token },
            relations: ['psychologist'],
        });
        if (!booking)
            throw new common_1.NotFoundException('Link de confirmação inválido');
        if (new Date() > booking.tokenExpiresAt)
            throw new common_1.BadRequestException('Este link expirou. Solicite um novo agendamento.');
        if (booking.status === 'cancelled')
            throw new common_1.BadRequestException('Esta sessão foi cancelada');
        if (booking.status === 'confirmed')
            return { message: 'Sessão já confirmada anteriormente ✓' };
        booking.status = 'confirmed';
        booking.confirmedAt = new Date();
        await this.bookings.save(booking);
        await this.notifications.sendBookingConfirmation(booking);
        return { message: 'Sessão confirmada com sucesso! 🎉' };
    }
    async cancelByToken(token, reason) {
        const booking = await this.bookings.findOne({ where: { confirmationToken: token } });
        if (!booking)
            throw new common_1.NotFoundException('Link inválido');
        if (new Date() > booking.tokenExpiresAt)
            throw new common_1.BadRequestException('Este link expirou.');
        if (booking.status === 'cancelled')
            return { message: 'Sessão já cancelada anteriormente.' };
        booking.status = 'cancelled';
        booking.cancelledAt = new Date();
        booking.cancellationReason = reason;
        await this.bookings.save(booking);
        return { message: 'Sessão cancelada. Esperamos te ver em breve 🌿' };
    }
    async getMyBookings(psychologistId, status) {
        const where = { psychologistId };
        if (status)
            where.status = status;
        return this.bookings.find({
            where,
            order: { date: 'ASC', time: 'ASC' },
        });
    }
    async confirmBooking(id, psychologistId) {
        const booking = await this.findOne(id, psychologistId);
        booking.status = 'confirmed';
        booking.confirmedAt = new Date();
        const saved = await this.bookings.save(booking);
        await this.notifications.sendBookingConfirmation(saved);
        return saved;
    }
    async rejectBooking(id, psychologistId, reason) {
        const booking = await this.findOne(id, psychologistId);
        booking.status = 'cancelled';
        booking.cancelledAt = new Date();
        booking.cancellationReason = reason;
        return this.bookings.save(booking);
    }
    async markPaid(id, psychologistId, method) {
        const booking = await this.findOne(id, psychologistId);
        booking.paymentStatus = 'paid';
        booking.paymentMethod = method;
        booking.paidAt = new Date();
        return this.bookings.save(booking);
    }
    async getMyPage(psychologistId) {
        return this.pages.findOne({ where: { psychologistId } });
    }
    async saveMyPage(psychologistId, dto) {
        let page = await this.pages.findOne({ where: { psychologistId } });
        if (page) {
            Object.assign(page, dto);
        }
        else {
            page = this.pages.create({ ...dto, psychologistId });
        }
        return this.pages.save(page);
    }
    async generateSlug(name) {
        const base = name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        const exists = await this.pages.findOne({ where: { slug: base } });
        return exists ? `${base}-${(0, crypto_1.randomBytes)(3).toString('hex')}` : base;
    }
    async findOne(id, psychologistId) {
        const b = await this.bookings.findOne({ where: { id, psychologistId } });
        if (!b)
            throw new common_1.NotFoundException();
        return b;
    }
};
exports.BookingService = BookingService;
exports.BookingService = BookingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(booking_entity_1.Booking)),
    __param(1, (0, typeorm_1.InjectRepository)(booking_page_entity_1.BookingPage)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        availability_service_1.AvailabilityService,
        notifications_service_1.NotificationsService])
], BookingService);
//# sourceMappingURL=booking.service.js.map