import { Repository } from 'typeorm';
import { Session } from './entities/session.entity';
import { CreateSessionDto } from './dto/create-session.dto';
import { FinancialService } from '../financial/financial.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Patient } from '../patients/entities/patient.entity';
import { User } from '../auth/entities/user.entity';
export declare class SessionsService {
    private repo;
    private patients;
    private users;
    private financial;
    private notifications;
    private readonly logger;
    constructor(repo: Repository<Session>, patients: Repository<Patient>, users: Repository<User>, financial: FinancialService, notifications: NotificationsService);
    private encryptFields;
    private dec;
    private findRaw;
    findAll(psychologistId: string, patientId?: string): Promise<Session[]>;
    findOne(id: string, psychologistId: string): Promise<Session>;
    create(dto: CreateSessionDto, psychologistId: string): Promise<Session>;
    update(id: string, dto: Partial<CreateSessionDto>, psychologistId: string): Promise<Session>;
    remove(id: string, psychologistId: string): Promise<{
        deleted: boolean;
    }>;
    private syncFinancialRecord;
    getDashboard(psychologistId: string): Promise<{
        sessionsThisMonth: number;
        sessionsThisWeek: number;
        pendingPayments: number;
        pendingAmount: number;
    }>;
}
