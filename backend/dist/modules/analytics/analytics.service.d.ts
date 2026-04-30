import { Repository } from 'typeorm';
import { Patient } from '../patients/entities/patient.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { FinancialRecord } from '../financial/entities/financial-record.entity';
export declare class AnalyticsService {
    private patients;
    private appointments;
    private financial;
    private readonly logger;
    constructor(patients: Repository<Patient>, appointments: Repository<Appointment>, financial: Repository<FinancialRecord>);
    getDashboardStats(userId: string): Promise<{
        activePatients: number;
        sessionsThisMonth: number;
        sessionsThisWeek: number;
        monthRevenue: number;
        pendingPayments: number;
        pendingAmount: any;
        inactivePatients: number;
        todayAppointments: Appointment[];
        revenueChart: {
            mes: string;
            valor: number;
        }[];
    }>;
}
