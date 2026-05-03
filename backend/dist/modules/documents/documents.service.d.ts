import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Document, DocType } from './entities/document.entity';
import { User } from '../auth/entities/user.entity';
export interface CreateDocumentDto {
    patientId: string;
    patientName: string;
    type: DocType;
    title: string;
    content: string;
}
export declare class DocumentsService {
    private repo;
    private cfg;
    private readonly logger;
    private readonly signSecret;
    private readonly encryptedPrefix;
    constructor(repo: Repository<Document>, cfg: ConfigService);
    private generateSignature;
    private encryptContent;
    private decryptContent;
    private getVerificationUrl;
    private exposeDocument;
    create(user: User, dto: CreateDocumentDto, signerIp?: string): Promise<Document>;
    findByUser(userId: string, type?: DocType): Promise<Document[]>;
    remove(id: string, userId: string): Promise<{
        deleted: boolean;
    }>;
    verifyByCode(signCode: string): Promise<{
        valid: boolean;
        document?: {
            signCode: string;
            type: DocType;
            title: string;
            patientName: string;
            psychologistName: string;
            psychologistCrp: string;
            signedAt: Date;
            createdAt: Date;
            fingerprint: string;
            algorithm: string;
            verificationUrl: string;
        };
    }>;
}
