import { FinancialService } from './financial.service';
import { CreateFinancialDto } from './dto/create-financial.dto';
export declare class FinancialController {
    private svc;
    constructor(svc: FinancialService);
    findAll(req: any, status?: string): Promise<import("./entities/financial-record.entity").FinancialRecord[]>;
    summary(req: any): Promise<{
        totalRevenue: number;
        paid: number;
        pending: number;
        overdue: number;
    }>;
    create(dto: CreateFinancialDto, req: any): Promise<import("./entities/financial-record.entity").FinancialRecord>;
    markPaid(id: string, method: string, req: any): Promise<import("./entities/financial-record.entity").FinancialRecord>;
}
