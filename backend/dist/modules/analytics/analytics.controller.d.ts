import { AnalyticsService } from './analytics.service';
export declare class AnalyticsController {
    private svc;
    constructor(svc: AnalyticsService);
    dashboard(req: any): Promise<{
        activePatients: number;
        sessionsThisMonth: number;
        sessionsThisWeek: number;
        monthRevenue: number;
        pendingPayments: number;
        pendingAmount: any;
        inactivePatients: number;
        todayAppointments: import("../appointments/entities/appointment.entity").Appointment[];
        revenueChart: {
            mes: string;
            valor: number;
        }[];
    }>;
}
