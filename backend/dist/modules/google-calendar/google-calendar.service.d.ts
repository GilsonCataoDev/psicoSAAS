import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
export declare class GoogleCalendarService {
    private users;
    private config;
    private readonly logger;
    constructor(users: Repository<User>, config: ConfigService);
    getStatus(userId: string): Promise<{
        connected: boolean;
        email: string;
    }>;
    getAuthUrl(userId: string): string;
    handleCallback(code: string, state: string): Promise<{
        redirectUrl: string;
    }>;
    disconnect(userId: string): Promise<{
        connected: boolean;
    }>;
    syncAppointment(appointment: Appointment): Promise<void>;
    deleteAppointment(appointment: Appointment): Promise<void>;
    private toGoogleEvent;
    private deleteExistingEvent;
    private getValidAccessToken;
    private exchangeCode;
    private refreshAccessToken;
    private fetchGoogleEmail;
    private signState;
    private verifyState;
    private getRedirectUri;
    private getFrontendUrl;
    private getRequiredConfig;
    private expiresAt;
    private appointmentDateTimes;
    private formatLocalDateTime;
}
