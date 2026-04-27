import { Repository } from 'typeorm';
import { FinancialRecord } from './entities/financial-record.entity';
import { CreateFinancialDto } from './dto/create-financial.dto';
export declare class FinancialService {
    private repo;
    constructor(repo: Repository<FinancialRecord>);
    findAll(psychologistId: string, status?: string): Promise<FinancialRecord[]>;
    findOne(id: string, psychologistId: string): Promise<FinancialRecord>;
    create(dto: CreateFinancialDto, psychologistId: string): Promise<FinancialRecord>;
    markPaid(id: string, method: string, psychologistId: string): Promise<FinancialRecord>;
    getSummary(psychologistId: string): Promise<{
        totalRevenue: number;
        paid: number;
        pending: number;
        overdue: number;
    }>;
}
