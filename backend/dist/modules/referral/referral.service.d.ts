import { Repository } from 'typeorm';
import { Referral } from './entities/referral.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { User } from '../auth/entities/user.entity';
import { EmailService } from '../email/email.service';
export declare class ReferralService {
    private refs;
    private subs;
    private email;
    private readonly logger;
    constructor(refs: Repository<Referral>, subs: Repository<Subscription>, email: EmailService);
    getOrCreateCode(user: User): Promise<string>;
    applyReferral(code: string, newUser: User): Promise<void>;
    grantRewardIfEligible(newUserId: string): Promise<void>;
    getStats(userId: string): Promise<{
        code: string;
        totalInvited: number;
        totalRewarded: number;
    }>;
}
