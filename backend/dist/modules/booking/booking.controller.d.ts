import { BookingService } from './booking.service';
import { SaveBookingPageDto } from './dto/save-booking-page.dto';
export declare class BookingController {
    private svc;
    constructor(svc: BookingService);
    getMyBookings(req: any, status?: string): Promise<import("./entities/booking.entity").Booking[]>;
    confirm(id: string, req: any): Promise<import("./entities/booking.entity").Booking>;
    reject(id: string, req: any, reason?: string): Promise<import("./entities/booking.entity").Booking>;
    markPaid(id: string, req: any, method: string): Promise<import("./entities/booking.entity").Booking>;
    getPage(req: any): Promise<import("./entities/booking-page.entity").BookingPage>;
    savePage(req: any, dto: SaveBookingPageDto): Promise<import("./entities/booking-page.entity").BookingPage>;
    suggestSlug(req: any): Promise<string>;
}
