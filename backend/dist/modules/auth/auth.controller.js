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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const auth_service_1 = require("./auth.service");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
const csrf_guard_1 = require("./guards/csrf.guard");
const register_dto_1 = require("./dto/register.dto");
const login_dto_1 = require("./dto/login.dto");
const update_profile_dto_1 = require("./dto/update-profile.dto");
const update_preferences_dto_1 = require("./dto/update-preferences.dto");
const change_password_dto_1 = require("./dto/change-password.dto");
const forgot_password_dto_1 = require("./dto/forgot-password.dto");
const reset_password_dto_1 = require("./dto/reset-password.dto");
const ACCESS_COOKIE = 'psicosaas_token';
const REFRESH_COOKIE = 'psicosaas_refresh';
function cookieBase() {
    const isProd = process.env.NODE_ENV === 'production';
    return {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        path: '/',
    };
}
function accessCookieOpts() {
    return { ...cookieBase(), maxAge: 15 * 60 * 1000 };
}
function refreshCookieOpts() {
    return {
        ...cookieBase(),
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/auth',
    };
}
function clearAccessOpts() { return cookieBase(); }
function clearRefreshOpts() { return { ...cookieBase(), path: '/api/auth' }; }
function getIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        ?? req.socket.remoteAddress
        ?? 'unknown';
}
let AuthController = class AuthController {
    constructor(auth) {
        this.auth = auth;
    }
    async register(dto, req, res) {
        const result = await this.auth.register(dto, getIp(req), req.headers['user-agent']);
        this.setAuthCookies(res, result.tokens);
        return { user: result.user, csrfToken: result.csrfToken };
    }
    async login(dto, req, res) {
        const result = await this.auth.login(dto, getIp(req), req.headers['user-agent']);
        this.setAuthCookies(res, result.tokens);
        return { user: result.user, csrfToken: result.csrfToken };
    }
    async refresh(req, res) {
        const rawToken = req.cookies?.[REFRESH_COOKIE];
        const result = await this.auth.refresh(rawToken, getIp(req), req.headers['user-agent']);
        this.setAuthCookies(res, result.tokens);
        return { user: result.user, csrfToken: result.csrfToken };
    }
    async logout(req, res) {
        await this.auth.revokeAllTokens(req.user.id, getIp(req));
        res.clearCookie(ACCESS_COOKIE, clearAccessOpts());
        res.clearCookie(REFRESH_COOKIE, clearRefreshOpts());
        return { message: 'Sessão encerrada com segurança 🔒' };
    }
    me(req) {
        return {
            ...req.user,
            csrfToken: this.auth.generateCsrfToken(req.user.id),
        };
    }
    updateProfile(req, dto) {
        return this.auth.updateProfile(req.user.id, dto);
    }
    updatePreferences(req, dto) {
        return this.auth.updatePreferences(req.user.id, dto);
    }
    changePassword(req, dto) {
        return this.auth.changePassword(req.user.id, dto.currentPassword, dto.newPassword);
    }
    async forgotPassword(dto) {
        await this.auth.forgotPassword(dto.email);
        return { message: 'Se este e-mail estiver cadastrado, você receberá as instruções em breve.' };
    }
    async resetPassword(dto) {
        await this.auth.resetPassword(dto.token, dto.password);
        return { message: 'Senha redefinida com sucesso. Faça login para continuar.' };
    }
    setAuthCookies(res, tokens) {
        res.cookie(ACCESS_COOKIE, tokens.accessToken, accessCookieOpts());
        res.cookie(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOpts());
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('register'),
    (0, throttler_1.Throttle)({ short: { limit: 3, ttl: 60000 } }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Response)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttler_1.Throttle)({ short: { limit: 5, ttl: 60000 } }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Response)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttler_1.Throttle)({ short: { limit: 10, ttl: 60000 } }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Response)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, csrf_guard_1.CsrfGuard),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Response)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, throttler_1.SkipThrottle)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "me", null);
__decorate([
    (0, common_1.Patch)('profile'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, csrf_guard_1.CsrfGuard),
    (0, throttler_1.SkipThrottle)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_profile_dto_1.UpdateProfileDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Patch)('preferences'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, csrf_guard_1.CsrfGuard),
    (0, throttler_1.SkipThrottle)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_preferences_dto_1.UpdatePreferencesDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "updatePreferences", null);
__decorate([
    (0, common_1.Patch)('password'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, csrf_guard_1.CsrfGuard),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, change_password_dto_1.ChangePasswordDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "changePassword", null);
__decorate([
    (0, common_1.Post)('forgot-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttler_1.Throttle)({ short: { limit: 3, ttl: 60000 } }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [forgot_password_dto_1.ForgotPasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "forgotPassword", null);
__decorate([
    (0, common_1.Post)('reset-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttler_1.Throttle)({ short: { limit: 5, ttl: 60000 } }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reset_password_dto_1.ResetPasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map