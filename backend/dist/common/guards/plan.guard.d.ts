import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Repository } from 'typeorm';
import { Subscription } from '../../modules/billing/entities/subscription.entity';
import { PLAN_LIMITS } from '../plans';
export { PLAN_LIMITS };
export declare class PlanGuard implements CanActivate {
    private reflector;
    private subs;
    constructor(reflector: Reflector, subs: Repository<Subscription>);
    canActivate(ctx: ExecutionContext): Promise<boolean>;
}
