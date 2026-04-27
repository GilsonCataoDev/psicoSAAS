import { User } from '../../auth/entities/user.entity';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled';
export type BillingType = 'CREDIT_CARD' | 'PIX' | 'BOLETO';
export type PlanId = 'free' | 'essencial' | 'pro';
export declare class Subscription {
    id: string;
    userId: string;
    user: User;
    asaasCustomerId?: string;
    asaasSubscriptionId?: string;
    asaasPaymentId?: string;
    planId: PlanId;
    status: SubscriptionStatus;
    billingType?: BillingType;
    yearly: boolean;
    trialEndsAt?: Date;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd: boolean;
    createdAt: Date;
    updatedAt: Date;
}
