import { Repository } from 'typeorm';
import { FinancialRecord } from './entities/financial-record.entity';
import { CreateFinancialDto } from './dto/create-financial.dto';
import { ChargeCardDto } from './dto/charge-card.dto';
import { PatientAsaasService } from './asaas.service';
import { NotificationsService } from '../notifications/notifications.service';
import { User } from '../auth/entities/user.entity';
import { Patient } from '../patients/entities/patient.entity';
export declare class FinancialService {
    private repo;
    private users;
    private patients;
    private asaas;
    private notifications;
    private readonly logger;
    constructor(repo: Repository<FinancialRecord>, users: Repository<User>, patients: Repository<Patient>, asaas: PatientAsaasService, notifications: NotificationsService);
    findAll(psychologistId: string, status?: string, patientId?: string): Promise<FinancialRecord[]>;
    findOne(id: string, psychologistId: string): Promise<FinancialRecord>;
    findBySessionId(sessionId: string, psychologistId: string): Promise<FinancialRecord>;
    create(dto: CreateFinancialDto & {
        status?: string;
        paidAt?: string;
    }, psychologistId: string): Promise<FinancialRecord>;
    markPaid(id: string, method: string, psychologistId: string): Promise<FinancialRecord>;
    resetToPending(id: string, psychologistId: string): Promise<FinancialRecord>;
    sendChargeMessage(id: string, psychologistId: string): Promise<{
        message: string;
    }>;
    generatePaymentLink(id: string, psychologistId: string): Promise<{
        url: string;
    }>;
    chargeWithCard(id: string, psychologistId: string, dto: ChargeCardDto, remoteIp: string): Promise<{
        message: string;
        paymentId: string;
    }>;
    handleAsaasWebhook(event: string, payment: {
        id: string;
        externalReference?: string;
        billingType: string;
    }): Promise<void>;
    remove(id: string, psychologistId: string): Promise<{
        deleted: boolean;
    }>;
    getSummary(psychologistId: string): Promise<{
        totalRevenue: number;
        paid: number;
        pending: number;
        overdue: number;
    }>;
}
