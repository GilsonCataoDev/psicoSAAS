import { User } from '../../auth/entities/user.entity';
export type DocType = 'declaracao' | 'recibo' | 'relatorio' | 'atestado' | 'encaminhamento';
export declare class Document {
    id: string;
    userId: string;
    user: User;
    patientId: string;
    patientName: string;
    type: DocType;
    title: string;
    content: string;
    signCode: string;
    signHash: string;
    signedAt: Date;
    signerIp?: string;
    psychologistName: string;
    psychologistCrp: string;
    createdAt: Date;
}
