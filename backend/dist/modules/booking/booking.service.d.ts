import { Repository } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { BookingPage } from './entities/booking-page.entity';
import { AvailabilityService } from '../availability/availability.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { SaveBookingPageDto } from './dto/save-booking-page.dto';
export declare class BookingService {
    private bookings;
    private pages;
    private availability;
    private notifications;
    constructor(bookings: Repository<Booking>, pages: Repository<BookingPage>, availability: AvailabilityService, notifications: NotificationsService);
    getPublicPage(slug: string): Promise<{
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
    getAvailableSlots(slug: string, dateStr: string): Promise<string[]>;
    createBooking(slug: string, dto: CreateBookingDto): Promise<{
        id: string;
        confirmationToken: string;
        message: string;
    }>;
    confirmByToken(token: string): Promise<{
        message: string;
    }>;
    cancelByToken(token: string, reason?: string): Promise<{
        message: string;
    }>;
    getMyBookings(psychologistId: string, status?: string): Promise<Booking[]>;
    confirmBooking(id: string, psychologistId: string): Promise<Booking>;
    rejectBooking(id: string, psychologistId: string, reason?: string): Promise<Booking>;
    markPaid(id: string, psychologistId: string, method: string): Promise<Booking>;
    getMyPage(psychologistId: string): Promise<BookingPage>;
    saveMyPage(psychologistId: string, dto: SaveBookingPageDto): Promise<BookingPage>;
    generateSlug(name: string): Promise<string>;
    private findOne;
}
