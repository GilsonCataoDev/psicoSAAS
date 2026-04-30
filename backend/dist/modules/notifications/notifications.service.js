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
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const email_service_1 = require("../email/email.service");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    constructor(cfg, email) {
        this.cfg = cfg;
        this.email = email;
        this.logger = new common_1.Logger(NotificationsService_1.name);
        this.BASE_URL = cfg.get('FRONTEND_URL') ?? 'http://localhost:3000';
        this.WA_URL = cfg.get('WHATSAPP_API_URL') ?? '';
        this.WA_KEY = cfg.get('WHATSAPP_API_KEY') ?? '';
        this.WA_INSTANCE = cfg.get('WHATSAPP_INSTANCE') ?? 'default';
        this.waEnabled = !!(this.WA_URL && this.WA_KEY && cfg.get('NODE_ENV') === 'production');
    }
    async sendWhatsApp(phone, text) {
        if (!this.waEnabled) {
            this.logger.log(`[WhatsApp DEV] ${phone}: ${text.slice(0, 60)}...`);
            return;
        }
        const normalized = phone.replace(/\D/g, '');
        const withDdi = normalized.startsWith('55') ? normalized : `55${normalized}`;
        try {
            const res = await fetch(`${this.WA_URL}/message/sendText/${this.WA_INSTANCE}`, {
                method: 'POST',
                headers: {
                    'apikey': this.WA_KEY,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    number: withDdi,
                    text,
                }),
            });
            if (!res.ok) {
                const err = await res.text();
                this.logger.error(`[WhatsApp] Erro ${res.status}: ${err}`);
            }
        }
        catch (err) {
            this.logger.error('[WhatsApp] Falha de conexão', err);
        }
    }
    async scheduleReminder(appointment) {
        if (!appointment.patient?.phone)
            return;
        const { patient, date, time } = appointment;
        const first = patient.name.split(' ')[0];
        const dateLabel = (() => {
            try {
                const [y, m, d] = String(date).split('-').map(Number);
                return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
                    weekday: 'long', day: 'numeric', month: 'long',
                });
            }
            catch {
                return String(date);
            }
        })();
        const msg = `Olá, ${first}! 🌿\n\nLembrando que temos nosso encontro em *${dateLabel}* às *${time}*.\n\nAté lá! 💙`;
        await this.sendWhatsApp(patient.phone, msg);
    }
    async sendPaymentRequest(patient, amount, pixKey) {
        if (!patient?.phone)
            return;
        const firstName = patient.name.split(' ')[0];
        const msg = `Olá, ${firstName}! 💙\n\n` +
            `O valor da nossa sessão é R$ ${amount.toFixed(2)}.\n\n` +
            (pixKey ? `PIX: \`${pixKey}\`\n\n` : '') +
            `Obrigada! 🌿`;
        await this.sendWhatsApp(patient.phone, msg);
    }
    async sendBookingRequest(booking, page) {
        const confirmUrl = `${this.BASE_URL}/agendar/confirmar/${booking.confirmationToken}`;
        const cancelUrl = `${this.BASE_URL}/agendar/cancelar/${booking.confirmationToken}`;
        if (booking.patientPhone) {
            const patientMsg = `Olá, ${booking.patientName.split(' ')[0]}! 🌿\n\n` +
                `Recebemos sua solicitação para *${booking.date}* às *${booking.time}*.\n\n` +
                `Assim que confirmarmos, você receberá uma mensagem.\n` +
                `Precisando cancelar: ${cancelUrl}\n\nAté breve! 💙`;
            await this.sendWhatsApp(booking.patientPhone, patientMsg);
        }
        if (page.psychologist?.phone) {
            const psychMsg = `📅 *Nova solicitação de sessão*\n\n` +
                `Pessoa: ${booking.patientName}\n` +
                `Data: ${booking.date} às ${booking.time}\n` +
                (booking.patientNotes ? `Obs: ${booking.patientNotes}\n` : '') +
                `\nConfirmar: ${confirmUrl}`;
            await this.sendWhatsApp(page.psychologist.phone, psychMsg);
        }
        if (page.psychologist?.email) {
            await this.email.sendBookingRequest(booking.patientName, page.psychologist.email, booking.date, booking.time, confirmUrl);
        }
        this.logger.log(`[Booking] Nova solicitação: ${booking.patientName} — ${booking.date} ${booking.time}`);
    }
    async sendBookingConfirmation(booking) {
        const cancelUrl = `${this.BASE_URL}/agendar/cancelar/${booking.confirmationToken}`;
        const first = booking.patientName.split(' ')[0];
        if (booking.patientPhone) {
            const msg = `Ótima notícia, ${first}! 🎉\n\n` +
                `Sua sessão foi confirmada para *${booking.date}* às *${booking.time}*.\n\n` +
                `Precisando cancelar: ${cancelUrl}\n\nNos vemos lá! 💙`;
            await this.sendWhatsApp(booking.patientPhone, msg);
        }
        if (booking.patientEmail) {
            await this.email.sendBookingConfirmation(booking.patientName, booking.patientEmail, booking.date, booking.time, cancelUrl);
        }
        this.logger.log(`[Booking] Confirmação enviada: ${booking.patientName}`);
    }
    async sendPaymentReminder(booking, pixKey) {
        if (!booking.patientPhone)
            return;
        const firstName = booking.patientName.split(' ')[0];
        const msg = `Olá, ${firstName}! 💙\n\n` +
            `Passando para lembrar sobre o pagamento da nossa sessão ` +
            `(*R$ ${Number(booking.amount).toFixed(2)}*).\n\n` +
            (pixKey ? `Chave PIX: \`${pixKey}\`\n\n` : '') +
            `Qualquer dúvida, é só falar. 🌿`;
        await this.sendWhatsApp(booking.patientPhone, msg);
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        email_service_1.EmailService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map