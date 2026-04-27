import { SubscriptionsService } from './subscriptions.service';
import { AsaasService } from './asaas.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
export declare class SubscriptionsController {
    private subs;
    private asaas;
    constructor(subs: SubscriptionsService, asaas: AsaasService);
    getMe(req: any): Promise<import("./entities/subscription.entity").Subscription>;
    subscribe(req: any, dto: CreateSubscriptionDto): Promise<{
        subscription: import("./entities/subscription.entity").Subscription;
    }>;
    cancel(req: any): Promise<import("./entities/subscription.entity").Subscription>;
    handleWebhook(body: any): Promise<{
        received: boolean;
    }>;
}
