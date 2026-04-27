import { ConfigService } from '@nestjs/config';
interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
}
export declare class EmailService {
    private cfg;
    private readonly logger;
    private readonly from;
    private readonly apiKey;
    private readonly enabled;
    private readonly frontendUrl;
    constructor(cfg: ConfigService);
    send(opts: SendEmailOptions): Promise<void>;
    sendWelcome(name: string, email: string): Promise<void>;
    sendPasswordReset(name: string, email: string, resetToken: string): Promise<void>;
    sendBookingRequest(patientName: string, psychologistEmail: string, date: string, time: string, confirmUrl: string): Promise<void>;
    sendBookingConfirmation(patientName: string, patientEmail: string, date: string, time: string, cancelUrl: string): Promise<void>;
    sendTrialEndingReminder(name: string, email: string, daysLeft: number): Promise<void>;
    sendReferralReward(name: string, email: string, referredName: string): Promise<void>;
    private wrap;
}
export {};
