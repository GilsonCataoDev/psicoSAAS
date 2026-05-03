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
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const encrypt_util_1 = require("../../common/crypto/encrypt.util");
const document_entity_1 = require("./entities/document.entity");
const DOC_TYPE_LABELS = {
    declaracao: 'Declaracao de Comparecimento',
    recibo: 'Recibo de Pagamento',
    relatorio: 'Relatorio Psicologico',
    atestado: 'Atestado Psicologico',
    encaminhamento: 'Carta de Encaminhamento',
};
let DocumentsService = DocumentsService_1 = class DocumentsService {
    constructor(repo, cfg) {
        this.repo = repo;
        this.cfg = cfg;
        this.logger = new common_1.Logger(DocumentsService_1.name);
        this.encryptedPrefix = 'psicosaas.document.v1:';
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
    encryptContent(content) {
        return `${this.encryptedPrefix}${(0, encrypt_util_1.encrypt)(content)}`;
    }
    decryptContent(content) {
        if (!content.startsWith(this.encryptedPrefix))
            return (0, encrypt_util_1.safeDecrypt)(content) ?? '';
        return (0, encrypt_util_1.safeDecrypt)(content.slice(this.encryptedPrefix.length)) ?? '';
    }
    getVerificationUrl(signCode) {
        const frontendUrl = (this.cfg.get('FRONTEND_URL') ?? '').replace(/\/$/, '');
        return `${frontendUrl}/#/verificar/${encodeURIComponent(signCode)}`;
    }
    exposeDocument(doc) {
        const { signHash: _signHash, signerIp: _signerIp, ...safeDoc } = doc;
        return { ...safeDoc, content: this.decryptContent(doc.content) };
    }
    collectPdf(pdf) {
        return new Promise((resolve, reject) => {
            const chunks = [];
            pdf.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
            pdf.on('end', () => resolve(Buffer.concat(chunks)));
            pdf.on('error', reject);
        });
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
            content: this.encryptContent(dto.content),
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
        return this.exposeDocument(saved);
    }
    async findByUser(userId, type) {
        const where = { userId };
        if (type)
            where.type = type;
        const docs = await this.repo.find({ where, order: { createdAt: 'DESC' } });
        return docs.map((doc) => this.exposeDocument(doc));
    }
    async generatePdf(id, userId) {
        const stored = await this.repo.findOne({ where: { id } });
        if (!stored)
            throw new common_1.NotFoundException();
        if (stored.userId !== userId)
            throw new common_1.NotFoundException();
        const content = this.decryptContent(stored.content);
        const verificationUrl = this.getVerificationUrl(stored.signCode);
        const qrBuffer = await QRCode.toBuffer(verificationUrl, {
            errorCorrectionLevel: 'M',
            margin: 1,
            width: 220,
            color: { dark: '#1C1C1A', light: '#FFFFFF' },
        });
        const pdf = new PDFDocument({
            size: 'A4',
            margin: 54,
            bufferPages: true,
            info: {
                Title: stored.title,
                Author: stored.psychologistName,
                Subject: DOC_TYPE_LABELS[stored.type] ?? stored.type,
                Keywords: `PsicoSaaS, ${stored.signCode}, autenticidade`,
            },
        });
        const done = this.collectPdf(pdf);
        const pageWidth = pdf.page.width;
        const pageHeight = pdf.page.height;
        const left = 54;
        const right = pageWidth - 54;
        const contentWidth = right - left;
        const sage = '#2F7657';
        const ink = '#2B2B29';
        const muted = '#6F6F68';
        const line = '#D9DED8';
        const drawHeader = () => {
            pdf.rect(0, 0, pageWidth, 90).fill('#F4F8F5');
            pdf.fillColor(sage).font('Helvetica-Bold').fontSize(10).text('PsicoSaaS', left, 30);
            pdf.fillColor(ink).font('Helvetica-Bold').fontSize(18)
                .text(DOC_TYPE_LABELS[stored.type].toUpperCase(), left, 48, { width: contentWidth - 120 });
            pdf.fillColor(muted).font('Helvetica').fontSize(9)
                .text('Documento psicologico emitido com verificacao de autenticidade', left, 72);
            pdf.strokeColor('#DCE8DF').lineWidth(1).moveTo(left, 90).lineTo(right, 90).stroke();
            pdf.y = 126;
        };
        const drawFooter = (pageNumber, totalPages) => {
            const footerY = pageHeight - 58;
            pdf.strokeColor(line).lineWidth(1).moveTo(left, footerY).lineTo(right, footerY).stroke();
            pdf.fillColor(muted).font('Helvetica').fontSize(8)
                .text(`Codigo: ${stored.signCode}`, left, footerY + 12, { width: 220 });
            pdf.text(`Pagina ${pageNumber} de ${totalPages}`, right - 90, footerY + 12, { width: 90, align: 'right' });
        };
        pdf.on('pageAdded', drawHeader);
        drawHeader();
        pdf.fillColor(ink).font('Helvetica').fontSize(11);
        pdf.text(content, left, 126, {
            width: contentWidth,
            align: 'justify',
            lineGap: 5,
        });
        if (pdf.y > pageHeight - 315) {
            pdf.addPage();
        }
        const signatureY = Math.max(pdf.y + 38, 450);
        pdf.strokeColor('#8D928C').lineWidth(1.2).moveTo(left, signatureY).lineTo(left + 210, signatureY).stroke();
        pdf.fillColor(ink).font('Helvetica-Bold').fontSize(10).text(stored.psychologistName, left, signatureY + 12);
        pdf.fillColor(muted).font('Helvetica').fontSize(9).text(`Psicologo(a) - CRP ${stored.psychologistCrp}`, left, signatureY + 28);
        pdf.text(`Assinado em ${stored.signedAt.toLocaleDateString('pt-BR', { dateStyle: 'long' })}`, left, signatureY + 42);
        const qrX = right - 96;
        pdf.roundedRect(qrX - 10, signatureY - 12, 106, 132, 8).strokeColor('#D6DDD8').stroke();
        pdf.image(qrBuffer, qrX, signatureY - 2, { width: 86, height: 86 });
        pdf.fillColor(muted).font('Helvetica').fontSize(7)
            .text('Verificar autenticidade', qrX - 5, signatureY + 88, { width: 96, align: 'center' });
        const boxY = signatureY + 150;
        pdf.roundedRect(left, boxY, contentWidth, 78, 10).fillAndStroke('#EEF8F3', '#CFE5D9');
        pdf.fillColor(sage).font('Helvetica-Bold').fontSize(10)
            .text('Documento com autenticidade verificavel', left + 18, boxY + 16);
        pdf.fillColor(sage).font('Helvetica').fontSize(9)
            .text(`Codigo: ${stored.signCode}`, left + 18, boxY + 34)
            .text(`Hash: ${stored.signHash.slice(0, 16).toUpperCase()} | Algoritmo: HMAC-SHA256`, left + 18, boxY + 49);
        pdf.fillColor(muted).font('Helvetica').fontSize(8)
            .text(verificationUrl, left + 270, boxY + 25, { width: contentWidth - 288, align: 'right' });
        pdf.fillColor('#777B76').font('Helvetica').fontSize(7.5)
            .text('A verificacao acima confirma que o documento registrado na plataforma nao foi alterado desde a emissao. Para assinatura digital com validade juridica plena, utilize certificado ICP-Brasil ou assinatura gov.br nos termos aplicaveis.', left, boxY + 98, { width: contentWidth, align: 'center', lineGap: 2 });
        const range = pdf.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i += 1) {
            pdf.switchToPage(i);
            drawFooter(i + 1, range.count);
        }
        pdf.end();
        const buffer = await done;
        const filename = `${stored.signCode}-${stored.type}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '_');
        return { filename, buffer };
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
        const content = this.decryptContent(doc.content);
        const data = `${content}:${doc.userId}:${timestamp}`;
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
                fingerprint: doc.signHash.slice(0, 16).toUpperCase(),
                algorithm: 'HMAC-SHA256',
                verificationUrl: this.getVerificationUrl(doc.signCode),
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