import { ConfigService } from '@nestjs/config';
import { User } from '../auth/entities/user.entity';
export interface TokenizeCreditCardInput {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
    cpfCnpj?: string;
    postalCode?: string;
    addressNumber?: string;
    phone?: string;
    email?: string;
    remoteIp?: string;
}
export declare class AsaasService {
    private readonly cfg;
    private readonly api;
    private readonly logger;
    constructor(cfg: ConfigService);
    createCustomer(user: User): Promise<string>;
    tokenizeCreditCard(user: User, input: TokenizeCreditCardInput): Promise<string>;
    createSubscription(customerId: string, plan: string, externalReference: string, creditCardToken: string, nextDueDate?: string): Promise<string>;
    updateSubscriptionCreditCard(subscriptionId: string, creditCardToken: string): Promise<void>;
    cancelSubscription(subscriptionId: string): Promise<void>;
    retryLatestSubscriptionPayment(subscriptionId: string, creditCardToken: string): Promise<void>;
    addDays(days: number): string;
    private validateCreditCardInput;
    private findOrCreateTokenizationCustomer;
}
