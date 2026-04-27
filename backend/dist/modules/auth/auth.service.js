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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcryptjs");
const user_entity_1 = require("./entities/user.entity");
const email_service_1 = require("../email/email.service");
let AuthService = class AuthService {
    constructor(users, jwt, email) {
        this.users = users;
        this.jwt = jwt;
        this.email = email;
    }
    async register(dto) {
        const exists = await this.users.findOneBy({ email: dto.email.toLowerCase() });
        if (exists)
            throw new common_1.ConflictException('E-mail já cadastrado');
        const passwordHash = await bcrypt.hash(dto.password, 12);
        const user = this.users.create({
            ...dto,
            email: dto.email.toLowerCase(),
            passwordHash,
        });
        await this.users.save(user);
        this.email.sendWelcome(user.name, user.email).catch(() => { });
        return this.buildResponse(user);
    }
    async login(dto) {
        const user = await this.users.findOneBy({ email: dto.email.toLowerCase() });
        const dummyHash = '$2a$12$dummyhashtopreventtimingattack000000000000000000000000';
        const hash = user?.passwordHash ?? dummyHash;
        const valid = await bcrypt.compare(dto.password, hash);
        if (!user || !valid)
            throw new common_1.UnauthorizedException('Credenciais inválidas');
        return this.buildResponse(user);
    }
    async findById(id) {
        return this.users.findOneBy({ id });
    }
    buildResponse(user) {
        const token = this.jwt.sign({ sub: user.id, email: user.email }, { expiresIn: '7d' });
        const { passwordHash: _, ...profile } = user;
        return { user: profile, token };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        jwt_1.JwtService,
        email_service_1.EmailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map