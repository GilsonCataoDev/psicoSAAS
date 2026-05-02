import { FinancialService } from './financial.service';
import { CreateFinancialDto } from './dto/create-financial.dto';
import { ChargeCardDto } from './dto/charge-card.dto';
export declare class FinancialController {
    private svc;
    constructor(svc: FinancialService);
    findAll(req: any, status?: string, patientId?: string): Promise<import("./entities/financial-record.entity").FinancialRecord[]>;
    summary(req: any): Promise<{
        totalRevenue: number;
        paid: number;
        pending: number;
        overdue: number;
    }>;
    create(dto: CreateFinancialDto, req: any): Promise<import("./entities/financial-record.entity").FinancialRecord>;
    markPaid(id: string, method: string, req: any): Promise<import("./entities/financial-record.entity").FinancialRecord>;
    sendCharge(id: string, req: any): Promise<{
        message: string;
    }>;
    generatePaymentLink(id: string, req: any): Promise<{
        url: string;
    }>;
    chargeWithCard(id: string, dto: ChargeCardDto, req: any, ip: string): Promise<{
        message: string;
        paymentId: string;
    }>;
    remove(id: string, req: any): Promise<{
        deleted: boolean;
    }>;
}
export declare class AsaasWebhookController {
    private svc;
    constructor(svc: FinancialService);
    handle(token: string, body: {
        event: string;
        payment: any;
    }): Promise<{
        ok: boolean;
    }>;
}
