import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { EmailService } from '../email/email.service';
import { User } from '../auth/entities/user.entity';
import { Subscription } from './entities/subscription.entity';
import { WebhookEvent } from './entities/webhook-event.entity';
export declare class BillingWebhookService {
    private readonly subscriptions;
    private readonly events;
    private readonly users;
    private readonly cfg;
    private readonly email;
    private readonly logger;
    constructor(subscriptions: Repository<Subscription>, events: Repository<WebhookEvent>, users: Repository<User>, cfg: ConfigService, email: EmailService);
    isValidOrigin(headers: Record<string, any>, payload: any): boolean;
    process(payload: any): Promise<void>;
    private logOnce;
    private findSubscription;
    private getCurrentPeriodEnd;
    private getEventId;
    private sendPaymentFailedEmail;
}
