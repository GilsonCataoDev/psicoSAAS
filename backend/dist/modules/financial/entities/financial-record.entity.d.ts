import { Patient } from '../../patients/entities/patient.entity';
import { User } from '../../auth/entities/user.entity';
export declare class FinancialRecord {
    id: string;
    type: 'income' | 'expense';
    amount: number;
    description: string;
    status: string;
    dueDate?: string;
    paidAt?: string;
    method?: string;
    sessionId?: string;
    receiptUrl?: string;
    asaasPaymentId?: string;
    paymentLinkUrl?: string;
    patientId?: string;
    patient?: Patient;
    psychologistId: string;
    psychologist: User;
    createdAt: Date;
}
