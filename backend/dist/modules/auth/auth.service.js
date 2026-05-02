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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = exports.CURRENT_TERMS_VERSION = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcryptjs");
const crypto_1 = require("crypto");
const encrypt_util_1 = require("../../common/crypto/encrypt.util");
const user_entity_1 = require("./entities/user.entity");
const refresh_token_entity_1 = require("./entities/refresh-token.entity");
const email_service_1 = require("../email/email.service");
const referral_service_1 = require("../referral/referral.service");
exports.CURRENT_TERMS_VERSION = '2026-05-02';
let AuthService = AuthService_1 = class AuthService {
    constructor(users, rtRepo, jwt, email, referral) {
        this.users = users;
        this.rtRepo = rtRepo;
        this.jwt = jwt;
        this.email = email;
        this.referral = referral;
        this.logger = new common_1.Logger(AuthService_1.name);
        this.auditLogger = new common_1.Logger('AuditLog');
        this.loginAttempts = new Map();
        this.MAX_ATTEMPTS = 10;
        this.WINDOW_MS = 15 * 60 * 1000;
    }
    async register(dto, ip, userAgent) {
        const exists = await this.users.findOneBy({ email: dto.email.toLowerCase() });
        if (exists)
            throw new common_1.ConflictException('E-mail já cadastrado');
        if (!dto.termsAccepted) {
            throw new common_1.BadRequestException('E necessario aceitar os Termos de Uso e a Politica de Privacidade');
        }
        const { referralCode, password, termsAccepted: _termsAccepted, termsVersion, ...userData } = dto;
        const passwordHash = await bcrypt.hash(password, 12);
        const user = this.users.create({
            ...userData,
            email: userData.email.toLowerCase(),
            passwordHash,
            termsAcceptedAt: new Date(),
            termsVersion: termsVersion ?? exports.CURRENT_TERMS_VERSION,
        });
        await this.users.save(user);
        if (referralCode) {
            this.referral.applyReferral(referralCode, user).catch(() => { });
        }
        this.email.sendWelcome(user.name, user.email).catch(() => { });
        this.audit('REGISTER', { userId: user.id, ip });
        return this.buildResult(user, ip, userAgent);
    }
    async login(dto, ip, userAgent) {
        const email = dto.email.toLowerCase();
        this.checkLoginRateLimit(email, ip);
        const user = await this.users.findOneBy({ email });
        const dummyHash = '$2a$12$dummyhashtopreventtimingattack000000000000000000000000';
        const hash = user?.passwordHash ?? dummyHash;
        const valid = await bcrypt.compare(dto.password, hash);
        if (!user || !valid) {
            this.recordLoginFailure(email);
            this.audit('LOGIN_FAILED', { email: this.maskEmail(email), ip });
            throw new common_1.UnauthorizedException('Credenciais inválidas');
        }
        this.clearLoginAttempts(email);
        this.audit('LOGIN_SUCCESS', { userId: user.id, ip });
        return this.buildResult(user, ip, userAgent);
    }
    async refresh(rawToken, ip, userAgent) {
        if (!rawToken)
            throw new common_1.UnauthorizedException('Refresh token ausente');
        const tokenHash = (0, encrypt_util_1.hashToken)(rawToken);
        const rt = await this.rtRepo
            .createQueryBuilder('rt')
            .addSelect('rt.tokenHash')
            .where('rt.tokenHash = :tokenHash', { tokenHash })
            .getOne();
        if (!rt) {
            throw new common_1.UnauthorizedException('Sessão inválida. Faça login novamente.');
        }
        if (rt.revoked) {
            await this.rtRepo.update({ userId: rt.userId }, { revoked: true });
            this.audit('REFRESH_REPLAY_DETECTED', { userId: rt.userId, ip });
            throw new common_1.UnauthorizedException('Sessão comprometida. Faça login novamente.');
        }
        if (new Date() > rt.expiresAt) {
            throw new common_1.UnauthorizedException('Sessão expirada. Faça login novamente.');
        }
        await this.rtRepo.update(rt.id, { revoked: true });
        const user = await this.users.findOneBy({ id: rt.userId });
        if (!user)
            throw new common_1.UnauthorizedException('Usuário não encontrado');
        this.audit('REFRESH_TOKEN_ROTATED', { userId: user.id, ip });
        return this.buildResult(user, ip, userAgent);
    }
    async revokeAllTokens(userId, ip) {
        await this.rtRepo.update({ userId, revoked: false }, { revoked: true });
        this.audit('LOGOUT', { userId, ip });
    }
    async findById(id) {
        const user = await this.users.findOneBy({ id });
        if (user?.preferences)
            user.preferences = this.exposePreferences(user.preferences);
        return user;
    }
    async updateProfile(id, data) {
        const user = await this.users.findOneBy({ id });
        if (!user)
            throw new common_1.NotFoundException();
        Object.assign(user, data);
        await this.users.save(user);
        const { passwordHash: _, resetPasswordToken: __, resetPasswordExpiry: ___, ...profile } = user;
        return profile;
    }
    async updatePreferences(id, preferences) {
        const user = await this.users.findOneBy({ id });
        if (!user)
            throw new common_1.NotFoundException();
        const next = { ...(user.preferences ?? {}), ...preferences };
        if (typeof next.asaasApiKey === 'string' && next.asaasApiKey.trim()) {
            next.asaasApiKey = (0, encrypt_util_1.encryptSecret)(next.asaasApiKey.trim());
        }
        user.preferences = next;
        await this.users.save(user);
        return this.exposePreferences(user.preferences);
    }
    async changePassword(id, currentPassword, newPassword) {
        const user = await this.users.findOneBy({ id });
        if (!user)
            throw new common_1.NotFoundException();
        const valid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!valid)
            throw new common_1.UnauthorizedException('Credenciais inválidas');
        user.passwordHash = await bcrypt.hash(newPassword, 12);
        await this.users.save(user);
        this.audit('PASSWORD_CHANGED', { userId: id });
        return { message: 'Senha alterada com sucesso' };
    }
    async forgotPassword(email) {
        const user = await this.users.findOneBy({ email: email.toLowerCase().trim() });
        if (!user)
            return;
        const token = (0, crypto_1.randomBytes)(32).toString('hex');
        user.resetPasswordToken = (0, encrypt_util_1.hashToken)(token);
        user.resetPasswordExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000);
        await this.users.save(user);
        this.email.sendPasswordReset(user.name, user.email, token).catch(() => { });
        this.audit('PASSWORD_RESET_REQUESTED', { email: this.maskEmail(email) });
    }
    async resetPassword(token, newPassword) {
        if (!token || !newPassword)
            throw new common_1.BadRequestException('Dados inválidos');
        if (newPassword.length < 8)
            throw new common_1.BadRequestException('A senha deve ter pelo menos 8 caracteres');
        const user = await this.users.findOneBy({ resetPasswordToken: (0, encrypt_util_1.hashToken)(token) });
        if (!user || !user.resetPasswordExpiry || user.resetPasswordExpiry < new Date()) {
            throw new common_1.BadRequestException('Link inválido ou expirado. Solicite um novo.');
        }
        user.passwordHash = await bcrypt.hash(newPassword, 12);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpiry = undefined;
        await this.users.save(user);
        await this.rtRepo.update({ userId: user.id }, { revoked: true });
        this.audit('PASSWORD_RESET_SUCCESS', { userId: user.id });
    }
    generateCsrfToken(userId) {
        return (0, encrypt_util_1.generateCsrfToken)(userId);
    }
    async buildResult(user, ip, userAgent) {
        const accessToken = this.jwt.sign({ sub: user.id, email: user.email }, { expiresIn: '15m' });
        const refreshToken = await this.createRefreshToken(user.id, ip, userAgent);
        const csrfToken = (0, encrypt_util_1.generateCsrfToken)(user.id);
        const { passwordHash: _, resetPasswordToken: __, resetPasswordExpiry: ___, ...safeUser } = user;
        if (safeUser.preferences)
            safeUser.preferences = this.exposePreferences(safeUser.preferences);
        return { user: safeUser, tokens: { accessToken, refreshToken }, csrfToken };
    }
    exposePreferences(preferences) {
        return {
            ...preferences,
            asaasApiKey: (0, encrypt_util_1.safeDecryptSecret)(preferences.asaasApiKey),
        };
    }
    async createRefreshToken(userId, ip, userAgent) {
        const rawToken = (0, crypto_1.randomBytes)(40).toString('hex');
        const rt = this.rtRepo.create({
            tokenHash: (0, encrypt_util_1.hashToken)(rawToken),
            userId,
            ipAddress: ip,
            userAgent: userAgent?.slice(0, 200),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        try {
            await this.rtRepo.save(rt);
        }
        catch (err) {
            this.logger.error(`createRefreshToken falhou: ${err?.message ?? err}`);
            throw err;
        }
        return rawToken;
    }
    checkLoginRateLimit(email, ip) {
        const now = Date.now();
        const entry = this.loginAttempts.get(email);
        if (!entry)
            return;
        if (now > entry.resetAt) {
            this.loginAttempts.delete(email);
            return;
        }
        if (entry.count >= this.MAX_ATTEMPTS) {
            const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
            this.audit('LOGIN_RATE_LIMITED', { email: this.maskEmail(email), ip, retryAfter: String(retryAfter) });
            throw new common_1.HttpException({ message: 'Muitas tentativas. Tente novamente em alguns minutos.', retryAfter }, common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
    }
    recordLoginFailure(email) {
        const now = Date.now();
        const entry = this.loginAttempts.get(email);
        if (!entry || now > entry.resetAt) {
            this.loginAttempts.set(email, { count: 1, resetAt: now + this.WINDOW_MS });
        }
        else {
            entry.count++;
        }
    }
    clearLoginAttempts(email) {
        this.loginAttempts.delete(email);
    }
    audit(event, ctx = {}) {
        this.auditLogger.log(`[${event}] ${JSON.stringify(ctx)}`);
    }
    maskEmail(email) {
        const [local, domain] = email.split('@');
        if (!domain)
            return '***';
        return `${local.slice(0, 2)}***@${domain}`;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(refresh_token_entity_1.RefreshToken)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        jwt_1.JwtService,
        email_service_1.EmailService,
        referral_service_1.ReferralService])
], AuthService);
//# sourceMappingURL=auth.service.js.map