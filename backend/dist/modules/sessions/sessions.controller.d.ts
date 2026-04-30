import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
export declare class SessionsController {
    private svc;
    constructor(svc: SessionsService);
    findAll(req: any, patientId?: string): Promise<import("./entities/session.entity").Session[]>;
    dashboard(req: any): Promise<{
        sessionsThisMonth: number;
        sessionsThisWeek: number;
        pendingPayments: number;
        pendingAmount: number;
    }>;
    findOne(id: string, req: any): Promise<import("./entities/session.entity").Session>;
    create(dto: CreateSessionDto, req: any): Promise<import("./entities/session.entity").Session>;
    update(id: string, dto: Partial<CreateSessionDto>, req: any): Promise<import("./entities/session.entity").Session>;
    remove(id: string, req: any): Promise<{
        deleted: boolean;
    }>;
}
