import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
export declare class NotificationsService {
    private cfg;
    private email;
    private readonly logger;
    private readonly BASE_URL;
    private readonly WA_URL;
    private readonly WA_KEY;
    private readonly WA_INSTANCE;
    private readonly waEnabled;
    constructor(cfg: ConfigService, email: EmailService);
    private sendWhatsApp;
    scheduleReminder(appointment: any): Promise<void>;
    sendPaymentRequest(patient: any, amount: number, pixKey?: string): Promise<void>;
    sendBookingRequest(booking: any, page: any): Promise<void>;
    sendBookingConfirmation(booking: any): Promise<void>;
    sendPaymentReminder(booking: any, pixKey?: string): Promise<void>;
}
