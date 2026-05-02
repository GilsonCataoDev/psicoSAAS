import { User } from '../../auth/entities/user.entity';
export type BillingSubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'pending' | 'trialing' | 'none';
export declare class Subscription {
    id: string;
    userId: string;
    user: User;
    plan: string;
    status: BillingSubscriptionStatus;
    gatewayCustomerId?: string;
    gatewaySubscriptionId?: string;
    currentPeriodEnd?: Date;
    trialEndsAt?: Date | null;
    cancelAtPeriodEnd: boolean;
    hasUsedTrial: boolean;
    createdAt: Date;
}
