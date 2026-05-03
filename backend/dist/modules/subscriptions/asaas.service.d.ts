import { ConfigService } from '@nestjs/config';
export interface AsaasCustomer {
    id: string;
    name: string;
    email: string;
}
export interface AsaasSubscription {
    id: string;
    status: string;
    nextDueDate: string;
    billingType: string;
    value: number;
}
export interface CreateSubscriptionDto {
    customerId: string;
    planId: 'essencial' | 'pro' | 'premium';
    billingType: 'CREDIT_CARD' | 'PIX' | 'BOLETO';
    yearly: boolean;
    creditCard?: {
        holderName: string;
        number: string;
        expiryMonth: string;
        expiryYear: string;
        ccv: string;
    };
    creditCardHolderInfo?: {
        name: string;
        email: string;
        cpfCnpj: string;
        postalCode: string;
        addressNumber: string;
        phone: string;
    };
    remoteIp?: string;
}
export declare class AsaasService {
    private cfg;
    private readonly api;
    private readonly logger;
    private readonly isSandbox;
    constructor(cfg: ConfigService);
    findOrCreateCustomer(userId: string, name: string, email: string, cpfCnpj: string): Promise<string>;
    createSubscription(dto: CreateSubscriptionDto): Promise<AsaasSubscription>;
    cancelSubscription(asaasSubscriptionId: string): Promise<void>;
    getSubscription(asaasSubscriptionId: string): Promise<AsaasSubscription>;
    getPaymentLink(asaasSubscriptionId: string): Promise<{
        pixCode?: string;
        pixQrCode?: string;
        boletoUrl?: string;
        boletoLine?: string;
    }>;
    validateWebhookToken(token: string): boolean;
}
