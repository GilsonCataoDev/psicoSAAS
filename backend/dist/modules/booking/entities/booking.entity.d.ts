import { User } from '../../auth/entities/user.entity';
export declare class Booking {
    id: string;
    patientName: string;
    patientEmail: string;
    patientPhone?: string;
    date: string;
    time: string;
    duration: number;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
    confirmationToken: string;
    tokenExpiresAt: Date;
    confirmedAt?: Date;
    cancelledAt?: Date;
    cancellationReason?: string;
    paymentStatus: 'pending' | 'paid' | 'waived' | 'refunded';
    amount: number;
    paymentMethod?: string;
    paymentId?: string;
    paidAt?: Date;
    appointmentId?: string;
    patientNotes?: string;
    psychologistId: string;
    psychologist: User;
    createdAt: Date;
    updatedAt: Date;
}
