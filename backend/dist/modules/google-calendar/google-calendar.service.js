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
var GoogleCalendarService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleCalendarService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const axios_1 = require("axios");
const crypto_1 = require("crypto");
const typeorm_2 = require("typeorm");
const encrypt_util_1 = require("../../common/crypto/encrypt.util");
const user_entity_1 = require("../auth/entities/user.entity");
let GoogleCalendarService = GoogleCalendarService_1 = class GoogleCalendarService {
    constructor(users, config) {
        this.users = users;
        this.config = config;
        this.logger = new common_1.Logger(GoogleCalendarService_1.name);
    }
    getStatus(userId) {
        return this.users.findOneBy({ id: userId }).then(user => {
            const prefs = (user?.preferences ?? {});
            return {
                connected: !!prefs.googleCalendarConnected && !!prefs.googleCalendarRefreshToken,
                email: prefs.googleCalendarEmail ?? null,
            };
        });
    }
    getAuthUrl(userId) {
        const clientId = this.getRequiredConfig('GOOGLE_CLIENT_ID');
        const redirectUri = this.getRedirectUri();
        const state = this.signState(userId);
        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            access_type: 'offline',
            prompt: 'consent',
            include_granted_scopes: 'true',
            state,
            scope: [
                'https://www.googleapis.com/auth/calendar.events',
                'https://www.googleapis.com/auth/userinfo.email',
            ].join(' '),
        });
        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }
    async handleCallback(code, state) {
        if (!code || !state)
            throw new common_1.BadRequestException('Retorno do Google invalido');
        const userId = this.verifyState(state);
        const tokens = await this.exchangeCode(code);
        if (!tokens.refresh_token) {
            throw new common_1.BadRequestException('O Google nao retornou permissao offline. Tente conectar novamente.');
        }
        const email = await this.fetchGoogleEmail(tokens.access_token).catch(() => undefined);
        const user = await this.users.findOneBy({ id: userId });
        if (!user)
            throw new common_1.BadRequestException('Usuario nao encontrado');
        user.preferences = {
            ...(user.preferences ?? {}),
            googleCalendarConnected: true,
            googleCalendarEmail: email,
            googleCalendarAccessToken: (0, encrypt_util_1.encryptSecret)(tokens.access_token),
            googleCalendarRefreshToken: (0, encrypt_util_1.encryptSecret)(tokens.refresh_token),
            googleCalendarExpiresAt: this.expiresAt(tokens.expires_in),
        };
        await this.users.save(user);
        return { redirectUrl: `${this.getFrontendUrl()}/#/configuracoes?tab=integrations&googleCalendar=connected` };
    }
    async disconnect(userId) {
        const user = await this.users.findOneBy({ id: userId });
        if (!user)
            return { connected: false };
        const prefs = { ...(user.preferences ?? {}) };
        delete prefs.googleCalendarConnected;
        delete prefs.googleCalendarEmail;
        delete prefs.googleCalendarAccessToken;
        delete prefs.googleCalendarRefreshToken;
        delete prefs.googleCalendarExpiresAt;
        user.preferences = prefs;
        await this.users.save(user);
        return { connected: false };
    }
    async syncAppointment(appointment) {
        const user = await this.users.findOneBy({ id: appointment.psychologistId });
        const prefs = (user?.preferences ?? {});
        if (!user || !prefs.googleCalendarConnected || !prefs.googleCalendarRefreshToken)
            return;
        try {
            const accessToken = await this.getValidAccessToken(user, prefs);
            await this.deleteExistingEvent(accessToken, appointment.id);
            await axios_1.default.post('https://www.googleapis.com/calendar/v3/calendars/primary/events', this.toGoogleEvent(appointment), { headers: { Authorization: `Bearer ${accessToken}` } });
        }
        catch (err) {
            this.logger.warn(`Falha ao sincronizar Google Agenda: ${err?.response?.data?.error?.message ?? err?.message ?? err}`);
        }
    }
    async deleteAppointment(appointment) {
        const user = await this.users.findOneBy({ id: appointment.psychologistId });
        const prefs = (user?.preferences ?? {});
        if (!user || !prefs.googleCalendarConnected || !prefs.googleCalendarRefreshToken)
            return;
        try {
            const accessToken = await this.getValidAccessToken(user, prefs);
            await this.deleteExistingEvent(accessToken, appointment.id);
        }
        catch (err) {
            this.logger.warn(`Falha ao remover evento do Google Agenda: ${err?.response?.data?.error?.message ?? err?.message ?? err}`);
        }
    }
    toGoogleEvent(appointment) {
        const timeZone = this.config.get('GOOGLE_CALENDAR_TIMEZONE') ?? 'America/Sao_Paulo';
        const { start, end } = this.appointmentDateTimes(appointment.date, appointment.time, appointment.duration || 50);
        const patientName = appointment.patient?.name ?? 'Paciente';
        const modality = appointment.modality === 'online' ? 'Online' : 'Presencial';
        return {
            summary: `Sessao - ${patientName}`,
            description: `Sessao agendada pela UseCognia.\nModalidade: ${modality}`,
            location: modality,
            start: { dateTime: start, timeZone },
            end: { dateTime: end, timeZone },
            extendedProperties: {
                private: {
                    usecogniaAppointmentId: appointment.id,
                },
            },
        };
    }
    async deleteExistingEvent(accessToken, appointmentId) {
        const { data } = await axios_1.default.get('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: {
                privateExtendedProperty: `usecogniaAppointmentId=${appointmentId}`,
                singleEvents: true,
                maxResults: 10,
            },
        });
        for (const event of data.items ?? []) {
            await axios_1.default.delete(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(event.id)}`, { headers: { Authorization: `Bearer ${accessToken}` } });
        }
    }
    async getValidAccessToken(user, prefs) {
        const currentToken = (0, encrypt_util_1.safeDecryptSecret)(prefs.googleCalendarAccessToken);
        const expiresAt = prefs.googleCalendarExpiresAt ? new Date(prefs.googleCalendarExpiresAt).getTime() : 0;
        if (currentToken && expiresAt > Date.now() + 60_000)
            return currentToken;
        const refreshToken = (0, encrypt_util_1.safeDecryptSecret)(prefs.googleCalendarRefreshToken);
        if (!refreshToken)
            throw new Error('Refresh token ausente');
        const tokens = await this.refreshAccessToken(refreshToken);
        user.preferences = {
            ...(user.preferences ?? {}),
            googleCalendarAccessToken: (0, encrypt_util_1.encryptSecret)(tokens.access_token),
            googleCalendarExpiresAt: this.expiresAt(tokens.expires_in),
        };
        await this.users.save(user);
        return tokens.access_token;
    }
    async exchangeCode(code) {
        const { data } = await axios_1.default.post('https://oauth2.googleapis.com/token', new URLSearchParams({
            code,
            client_id: this.getRequiredConfig('GOOGLE_CLIENT_ID'),
            client_secret: this.getRequiredConfig('GOOGLE_CLIENT_SECRET'),
            redirect_uri: this.getRedirectUri(),
            grant_type: 'authorization_code',
        }).toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
        return data;
    }
    async refreshAccessToken(refreshToken) {
        const { data } = await axios_1.default.post('https://oauth2.googleapis.com/token', new URLSearchParams({
            refresh_token: refreshToken,
            client_id: this.getRequiredConfig('GOOGLE_CLIENT_ID'),
            client_secret: this.getRequiredConfig('GOOGLE_CLIENT_SECRET'),
            grant_type: 'refresh_token',
        }).toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
        return data;
    }
    async fetchGoogleEmail(accessToken) {
        const { data } = await axios_1.default.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        return data.email;
    }
    signState(userId) {
        const expiresAt = Date.now() + 10 * 60 * 1000;
        const payload = `${userId}.${expiresAt}`;
        const signature = (0, crypto_1.createHmac)('sha256', this.getRequiredConfig('JWT_SECRET')).update(payload).digest('hex');
        return Buffer.from(`${payload}.${signature}`).toString('base64url');
    }
    verifyState(state) {
        const decoded = Buffer.from(state, 'base64url').toString('utf8');
        const [userId, expiresAt, signature] = decoded.split('.');
        if (!userId || !expiresAt || !signature)
            throw new common_1.BadRequestException('Estado OAuth invalido');
        if (Number(expiresAt) < Date.now())
            throw new common_1.BadRequestException('Conexao expirada. Tente novamente.');
        const payload = `${userId}.${expiresAt}`;
        const expected = (0, crypto_1.createHmac)('sha256', this.getRequiredConfig('JWT_SECRET')).update(payload).digest('hex');
        if (signature !== expected)
            throw new common_1.BadRequestException('Estado OAuth invalido');
        return userId;
    }
    getRedirectUri() {
        return this.config.get('GOOGLE_CALENDAR_REDIRECT_URI')
            ?? `${this.config.get('API_URL') ?? 'https://psicosaas-production-2d6c.up.railway.app/api'}/google-calendar/callback`;
    }
    getFrontendUrl() {
        return this.config.get('FRONTEND_URL')
            ?? this.config.get('PUBLIC_APP_URL')
            ?? 'https://gilsoncataodev.github.io/psicoSAAS';
    }
    getRequiredConfig(key) {
        const value = this.config.get(key);
        if (!value)
            throw new common_1.BadRequestException(`Configuracao ausente: ${key}`);
        return value;
    }
    expiresAt(expiresIn = 3600) {
        return new Date(Date.now() + Math.max(60, expiresIn - 60) * 1000).toISOString();
    }
    appointmentDateTimes(date, time, duration) {
        const [year, month, day] = date.split('-').map(Number);
        const [hour, minute] = time.slice(0, 5).split(':').map(Number);
        const start = new Date(year, month - 1, day, hour, minute);
        const end = new Date(start.getTime() + duration * 60_000);
        return {
            start: this.formatLocalDateTime(start),
            end: this.formatLocalDateTime(end),
        };
    }
    formatLocalDateTime(date) {
        const pad = (value) => String(value).padStart(2, '0');
        return [
            date.getFullYear(),
            pad(date.getMonth() + 1),
            pad(date.getDate()),
        ].join('-') + `T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
    }
};
exports.GoogleCalendarService = GoogleCalendarService;
exports.GoogleCalendarService = GoogleCalendarService = GoogleCalendarService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        config_1.ConfigService])
], GoogleCalendarService);
//# sourceMappingURL=google-calendar.service.js.map