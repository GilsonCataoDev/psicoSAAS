import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
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
    private config;
    constructor(bookings: Repository<Booking>, pages: Repository<BookingPage>, availability: AvailabilityService, notifications: NotificationsService, config: ConfigService);
    generateDailyToken(userId: string): string;
    resolveDailyToken(token: string): Promise<BookingPage | null>;
    getPublicPage(slugOrToken: string): Promise<{
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
    getAvailableSlots(slugOrToken: string, dateStr: string): Promise<string[]>;
    createBooking(slugOrToken: string, dto: CreateBookingDto): Promise<{
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
    getDailyLink(psychologistId: string, baseUrl: string): {
        token: string;
        url: string;
        expiresAt: string;
    };
    private findOne;
}
