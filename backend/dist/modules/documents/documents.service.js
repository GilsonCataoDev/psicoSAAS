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
var DocumentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crypto_1 = require("crypto");
const config_1 = require("@nestjs/config");
const document_entity_1 = require("./entities/document.entity");
let DocumentsService = DocumentsService_1 = class DocumentsService {
    constructor(repo, cfg) {
        this.repo = repo;
        this.cfg = cfg;
        this.logger = new common_1.Logger(DocumentsService_1.name);
        this.signSecret = cfg.getOrThrow('SIGN_SECRET');
    }
    generateSignature(content, userId, timestamp) {
        const data = `${content}:${userId}:${timestamp}`;
        const fullHash = (0, crypto_1.createHmac)('sha256', this.signSecret).update(data).digest('hex');
        const year = new Date().getFullYear();
        const shortCode = fullHash.slice(0, 8).toUpperCase();
        const signCode = `PS-${year}-${shortCode}`;
        return { signCode, signHash: fullHash };
    }
    async create(user, dto, signerIp) {
        const timestamp = Date.now();
        const { signCode, signHash } = this.generateSignature(dto.content, user.id, timestamp);
        const exists = await this.repo.findOne({ where: { signCode } });
        const finalCode = exists
            ? `PS-${new Date().getFullYear()}-${(0, crypto_1.randomBytes)(4).toString('hex').toUpperCase()}`
            : signCode;
        const doc = this.repo.create({
            ...dto,
            userId: user.id,
            signCode: finalCode,
            signHash,
            signedAt: new Date(timestamp),
            signerIp,
            psychologistName: user.name,
            psychologistCrp: user.crp,
        });
        const saved = await this.repo.save(doc);
        this.logger.log(`[Documento] Assinado: ${saved.signCode} por ${user.name} (CRP ${user.crp})`);
        return saved;
    }
    async findByUser(userId, type) {
        const where = { userId };
        if (type)
            where.type = type;
        return this.repo.find({ where, order: { createdAt: 'DESC' } });
    }
    async remove(id, userId) {
        const doc = await this.repo.findOne({ where: { id } });
        if (!doc)
            throw new common_1.NotFoundException();
        if (doc.userId !== userId)
            throw new common_1.NotFoundException();
        await this.repo.remove(doc);
        return { deleted: true };
    }
    async verifyByCode(signCode) {
        const doc = await this.repo.findOne({ where: { signCode } });
        if (!doc) {
            return { valid: false };
        }
        const timestamp = doc.signedAt.getTime();
        const data = `${doc.content}:${doc.userId}:${timestamp}`;
        const recomputedHash = (0, crypto_1.createHmac)('sha256', this.signSecret).update(data).digest('hex');
        const valid = recomputedHash === doc.signHash;
        if (!valid) {
            this.logger.warn(`[Verificação] Hash inválido para código ${signCode} — possível adulteração`);
            return { valid: false };
        }
        return {
            valid: true,
            document: {
                signCode: doc.signCode,
                type: doc.type,
                title: doc.title,
                patientName: doc.patientName,
                psychologistName: doc.psychologistName,
                psychologistCrp: doc.psychologistCrp,
                signedAt: doc.signedAt,
                createdAt: doc.createdAt,
            },
        };
    }
};
exports.DocumentsService = DocumentsService;
exports.DocumentsService = DocumentsService = DocumentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(document_entity_1.Document)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        config_1.ConfigService])
], DocumentsService);
//# sourceMappingURL=documents.service.js.map