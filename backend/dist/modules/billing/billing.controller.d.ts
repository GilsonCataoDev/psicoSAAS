import { AsaasService, TokenizeCreditCardInput } from './asaas.service';
import { BillingWebhookService } from './billing-webhook.service';
import { BillingService } from './billing.service';
export declare class BillingController {
    private readonly billing;
    private readonly asaas;
    private readonly webhooks;
    private readonly logger;
    constructor(billing: BillingService, asaas: AsaasService, webhooks: BillingWebhookService);
    tokenize(req: any, body: TokenizeCreditCardInput): Promise<{
        creditCardToken: string;
    }>;
    subscribe(req: any, plan?: string, creditCardToken?: string): Promise<import("./entities/subscription.entity").Subscription>;
    activateFree(req: any): Promise<import("./entities/subscription.entity").Subscription>;
    updateCard(req: any, creditCardToken?: string): Promise<import("./entities/subscription.entity").Subscription>;
    cancel(req: any): Promise<import("./entities/subscription.entity").Subscription>;
    metrics(): Promise<{
        active: number;
        trialing: number;
        past_due: number;
        canceled: number;
        mrr: number;
    }>;
    me(req: any): Promise<import("./entities/subscription.entity").Subscription | {
        status: string;
    }>;
    webhook(headers: Record<string, any>, body: any): {
        received: boolean;
    };
}
