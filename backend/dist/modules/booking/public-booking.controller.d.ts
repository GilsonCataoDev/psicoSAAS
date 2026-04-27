import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
export declare class PublicBookingController {
    private svc;
    constructor(svc: BookingService);
    getPage(slug: string): Promise<{
        psychologistName: string;
        psychologistCrp: string;
        specialty: string;
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
        createdAt: Date;
        updatedAt: Date;
    }>;
    getSlots(slug: string, date: string): Promise<string[]>;
    createBooking(slug: string, dto: CreateBookingDto): Promise<{
        id: string;
        confirmationToken: string;
        message: string;
    }>;
    confirm(token: string): Promise<{
        message: string;
    }>;
    cancel(token: string, reason?: string): Promise<{
        message: string;
    }>;
}
