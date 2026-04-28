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
const config_1 = require("@nestjs/config");
const date_fns_1 = require("date-fns");
const booking_entity_1 = require("./entities/booking.entity");
const booking_page_entity_1 = require("./entities/booking-page.entity");
const availability_service_1 = require("../availability/availability.service");
const notifications_service_1 = require("../notifications/notifications.service");
let BookingService = class BookingService {
    constructor(bookings, pages, availability, notifications, config) {
        this.bookings = bookings;
        this.pages = pages;
        this.availability = availability;
        this.notifications = notifications;
        this.config = config;
    }
    generateDailyToken(userId) {
        const secret = this.config.get('SIGN_SECRET') ?? 'fallback-secret';
        const today = new Date().toISOString().split('T')[0];
        const userPrefix = userId.replace(/-/g, '').slice(0, 8);
        const hmac = (0, crypto_1.createHmac)('sha256', secret);
        hmac.update(`${userId}:${today}`);
        const sig = hmac.digest('hex').slice(0, 8);
        return `${userPrefix}${sig}`;
    }
    async resolveDailyToken(token) {
        if (token.length !== 16)
            return null;
        const userPrefix = token.slice(0, 8);
        const candidates = await this.pages.find({
            where: { isActive: true },
            relations: ['psychologist'],
        });
        const secret = this.config.get('SIGN_SECRET') ?? 'fallback-secret';
        const today = new Date().toISOString().split('T')[0];
        for (const page of candidates) {
            const pPrefix = page.psychologistId.replace(/-/g, '').slice(0, 8);
            if (pPrefix !== userPrefix)
                continue;
            const hmac = (0, crypto_1.createHmac)('sha256', secret);
            hmac.update(`${page.psychologistId}:${today}`);
            const expectedSig = hmac.digest('hex').slice(0, 8);
            if (token.slice(8) === expectedSig)
                return page;
        }
        return null;
    }
    async getPublicPage(slugOrToken) {
        let page = null;
        if (/^[0-9a-f]{16}$/.test(slugOrToken)) {
            page = await this.resolveDailyToken(slugOrToken);
        }
        if (!page) {
            page = await this.pages.findOne({
                where: { slug: slugOrToken, isActive: true },
                relations: ['psychologist'],
            });
        }
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
    async getAvailableSlots(slugOrToken, dateStr) {
        let page = null;
        if (/^[0-9a-f]{16}$/.test(slugOrToken)) {
            page = await this.resolveDailyToken(slugOrToken);
        }
        if (!page) {
            page = await this.pages.findOne({ where: { slug: slugOrToken, isActive: true } });
        }
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
    async createBooking(slugOrToken, dto) {
        let page = null;
        if (/^[0-9a-f]{16}$/.test(slugOrToken)) {
            page = await this.resolveDailyToken(slugOrToken);
        }
        if (!page) {
            page = await this.pages.findOne({
                where: { slug: slugOrToken, isActive: true },
                relations: ['psychologist'],
            });
        }
        if (!page)
            throw new common_1.NotFoundException();
        if (!page.psychologist) {
            page = await this.pages.findOne({
                where: { id: page.id },
                relations: ['psychologist'],
            });
        }
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
        let page = await this.pages.findOne({ where: { psychologistId } });
        if (!page) {
            const autoSlug = `psi-${psychologistId.replace(/-/g, '').slice(0, 12)}`;
            page = this.pages.create({
                psychologistId,
                slug: autoSlug,
                title: 'Agende sua sessão',
                sessionPrice: 150,
                sessionDuration: 50,
                slotInterval: 60,
                isActive: true,
            });
            page = await this.pages.save(page);
        }
        return page;
    }
    async saveMyPage(psychologistId, dto) {
        let page = await this.pages.findOne({ where: { psychologistId } });
        if (page) {
            Object.assign(page, dto);
        }
        else {
            const autoSlug = `psi-${psychologistId.replace(/-/g, '').slice(0, 12)}`;
            page = this.pages.create({ ...dto, psychologistId, slug: autoSlug });
        }
        return this.pages.save(page);
    }
    getDailyLink(psychologistId, baseUrl) {
        const token = this.generateDailyToken(psychologistId);
        const now = new Date();
        const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
        return {
            token,
            url: `${baseUrl}/agendar/${token}`,
            expiresAt: tomorrow.toISOString(),
        };
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
        notifications_service_1.NotificationsService,
        config_1.ConfigService])
], BookingService);
//# sourceMappingURL=booking.service.js.map