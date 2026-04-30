import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Repository } from 'typeorm';
import { Subscription } from '../../modules/billing/entities/subscription.entity';
declare const SubscriptionGuard_base: import("@nestjs/passport").Type<import("@nestjs/passport").IAuthGuard>;
export declare class SubscriptionGuard extends SubscriptionGuard_base implements CanActivate {
    private readonly reflector;
    private readonly subscriptions;
    constructor(reflector: Reflector, subscriptions: Repository<Subscription>);
    canActivate(ctx: ExecutionContext): Promise<boolean>;
    private isPublicRoute;
    private isIgnoredPath;
    private isWithinGracePeriod;
}
export {};
