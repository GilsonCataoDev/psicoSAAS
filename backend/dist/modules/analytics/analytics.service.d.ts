import { Repository } from 'typeorm';
import { Patient } from '../patients/entities/patient.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { FinancialRecord } from '../financial/entities/financial-record.entity';
export declare class AnalyticsService {
    private patients;
    private appointments;
    private financial;
    constructor(patients: Repository<Patient>, appointments: Repository<Appointment>, financial: Repository<FinancialRecord>);
    getDashboardStats(userId: string): Promise<{
        activePatients: number;
        sessionsThisMonth: number;
        sessionsThisWeek: number;
        monthRevenue: number;
        pendingPayments: number;
        pendingAmount: number;
        inactivePatients: number;
        todayAppointments: Appointment[];
        revenueChart: {
            mes: string;
            valor: number;
        }[];
    }>;
}
