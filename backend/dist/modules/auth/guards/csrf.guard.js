"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CsrfGuard = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const encrypt_util_1 = require("../../../common/crypto/encrypt.util");
let CsrfGuard = class CsrfGuard {
    canActivate(context) {
        const req = context.switchToHttp().getRequest();
        if (['GET', 'HEAD', 'OPTIONS'].includes(req.method))
            return true;
        const user = req.user;
        if (!user?.id)
            return true;
        const header = req.headers['x-csrf-token'];
        const expected = (0, encrypt_util_1.generateCsrfToken)(user.id);
        if (!header)
            throw new common_1.ForbiddenException('CSRF token ausente');
        try {
            const hBuf = Buffer.from(header, 'hex');
            const eBuf = Buffer.from(expected, 'hex');
            if (hBuf.length !== eBuf.length || !(0, crypto_1.timingSafeEqual)(hBuf, eBuf)) {
                throw new common_1.ForbiddenException('CSRF token inválido');
            }
        }
        catch {
            throw new common_1.ForbiddenException('CSRF token inválido');
        }
        return true;
    }
};
exports.CsrfGuard = CsrfGuard;
exports.CsrfGuard = CsrfGuard = __decorate([
    (0, common_1.Injectable)()
], CsrfGuard);
//# sourceMappingURL=csrf.guard.js.map