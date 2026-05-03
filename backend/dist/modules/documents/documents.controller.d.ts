import { Response } from 'express';
import { DocumentsService, CreateDocumentDto } from './documents.service';
import { DocType } from './entities/document.entity';
declare class CreateDocumentBodyDto implements CreateDocumentDto {
    patientId: string;
    patientName: string;
    type: DocType;
    title: string;
    content: string;
}
export declare class DocumentsController {
    private svc;
    constructor(svc: DocumentsService);
    create(req: any, body: CreateDocumentBodyDto): Promise<import("./entities/document.entity").Document>;
    findMine(req: any): Promise<import("./entities/document.entity").Document[]>;
    pdf(id: string, req: any, res: Response): Promise<void>;
    remove(id: string, req: any): Promise<{
        deleted: boolean;
    }>;
    verify(code: string): Promise<{
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
export {};
