import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { EmailService } from '../email/email.service';
import { Subscription } from './entities/subscription.entity';
export declare class BillingTrialEmailJob implements OnModuleInit, OnModuleDestroy {
    private readonly subscriptions;
    private readonly email;
    private readonly logger;
    private timer?;
    constructor(subscriptions: Repository<Subscription>, email: EmailService);
    onModuleInit(): void;
    onModuleDestroy(): void;
    run(): Promise<void>;
}
