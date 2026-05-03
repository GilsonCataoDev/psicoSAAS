import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { EmailService } from '../email/email.service';
import { Subscription } from '../billing/entities/subscription.entity';
export declare class NotificationsService {
    private cfg;
    private email;
    private subs;
    private readonly logger;
    private readonly BASE_URL;
    private readonly WA_URL;
    private readonly WA_KEY;
    private readonly WA_INSTANCE;
    private readonly waEnabled;
    constructor(cfg: ConfigService, email: EmailService, subs: Repository<Subscription>);
    private canUseWhatsAppAutomation;
    private sendWhatsApp;
    scheduleReminder(appointment: any): Promise<void>;
    sendPaymentRequest(patient: any, amount: number, pixKey?: string): Promise<void>;
    sendBookingRequest(booking: any, page: any): Promise<void>;
    sendBookingConfirmation(booking: any): Promise<void>;
    sendPaymentReminder(booking: any, pixKey?: string): Promise<void>;
}
