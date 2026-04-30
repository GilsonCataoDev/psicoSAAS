import { ConfigService } from '@nestjs/config';
import { User } from '../auth/entities/user.entity';
export interface TokenizeCreditCardInput {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
}
export declare class AsaasService {
    private readonly cfg;
    private readonly api;
    private readonly logger;
    constructor(cfg: ConfigService);
    createCustomer(user: User): Promise<string>;
    tokenizeCreditCard(input: TokenizeCreditCardInput): Promise<string>;
    createSubscription(customerId: string, plan: string, externalReference: string, creditCardToken: string, nextDueDate?: string): Promise<string>;
    updateSubscriptionCreditCard(subscriptionId: string, creditCardToken: string): Promise<void>;
    retryLatestSubscriptionPayment(subscriptionId: string, creditCardToken: string): Promise<void>;
    addDays(days: number): string;
    private validateCreditCardInput;
}
