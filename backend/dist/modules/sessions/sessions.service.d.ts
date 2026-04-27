import { Repository } from 'typeorm';
import { Session } from './entities/session.entity';
import { CreateSessionDto } from './dto/create-session.dto';
export declare class SessionsService {
    private repo;
    constructor(repo: Repository<Session>);
    findAll(psychologistId: string, patientId?: string): Promise<Session[]>;
    findOne(id: string, psychologistId: string): Promise<Session>;
    create(dto: CreateSessionDto, psychologistId: string): Promise<Session>;
    update(id: string, dto: Partial<CreateSessionDto>, psychologistId: string): Promise<Session>;
    getDashboard(psychologistId: string): Promise<{
        sessionsThisMonth: number;
        sessionsThisWeek: number;
        pendingPayments: number;
        pendingAmount: number;
    }>;
}
