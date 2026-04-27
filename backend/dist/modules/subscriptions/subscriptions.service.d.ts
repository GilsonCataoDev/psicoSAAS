import { Repository } from 'typeorm';
import { Subscription } from './entities/subscription.entity';
import { AsaasService } from './asaas.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { User } from '../auth/entities/user.entity';
export declare class SubscriptionsService {
    private repo;
    private asaas;
    private readonly logger;
    constructor(repo: Repository<Subscription>, asaas: AsaasService);
    getByUserId(userId: string): Promise<Subscription | null>;
    getOrCreateTrial(userId: string): Promise<Subscription>;
    subscribe(user: User, dto: CreateSubscriptionDto, remoteIp: string): Promise<{
        subscription: Subscription;
    }>;
    handleWebhook(event: any): Promise<void>;
    cancel(userId: string): Promise<Subscription>;
}
