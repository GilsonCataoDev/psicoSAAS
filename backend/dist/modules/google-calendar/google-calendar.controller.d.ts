import type { Response } from 'express';
import { GoogleCalendarService } from './google-calendar.service';
export declare class GoogleCalendarController {
    private readonly googleCalendar;
    constructor(googleCalendar: GoogleCalendarService);
    status(req: any): Promise<{
        connected: boolean;
        email: string;
    }>;
    connect(req: any): {
        url: string;
    };
    callback(code: string, state: string, res: Response): Promise<void>;
    disconnect(req: any): Promise<{
        connected: boolean;
    }>;
}
