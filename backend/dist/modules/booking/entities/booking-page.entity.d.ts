import { User } from '../../auth/entities/user.entity';
export declare class BookingPage {
    id: string;
    slug: string;
    isActive: boolean;
    title?: string;
    description?: string;
    avatarUrl?: string;
    sessionPrice: number;
    sessionDuration: number;
    slotInterval: number;
    allowPresencial: boolean;
    allowOnline: boolean;
    minAdvanceDays: number;
    maxAdvanceDays: number;
    requirePaymentUpfront: boolean;
    pixKey?: string;
    mercadoPagoPublicKey?: string;
    confirmationMessage?: string;
    psychologistId: string;
    psychologist: User;
    createdAt: Date;
    updatedAt: Date;
}
