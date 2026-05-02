import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { AsaasService } from './asaas.service';
import { Subscription } from './entities/subscription.entity';
export declare class BillingService {
    private readonly repo;
    private readonly asaas;
    constructor(repo: Repository<Subscription>, asaas: AsaasService);
    getMine(userId: string): Promise<Subscription | {
        status: string;
    }>;
    subscribe(user: User, plan?: string, creditCardToken?: string): Promise<Subscription>;
    updateCard(userId: string, creditCardToken?: string): Promise<Subscription>;
    cancel(userId: string): Promise<Subscription>;
    getMetrics(): Promise<{
        active: number;
        trialing: number;
        past_due: number;
        canceled: number;
        mrr: number;
    }>;
}
