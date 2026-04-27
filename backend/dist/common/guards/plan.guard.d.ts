import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Repository } from 'typeorm';
import { Subscription } from '../../modules/subscriptions/entities/subscription.entity';
export declare const PLAN_LIMITS: {
    free: {
        maxPatients: number;
        maxDocuments: number;
    };
    essencial: {
        maxPatients: number;
        maxDocuments: number;
    };
    pro: {
        maxPatients: number;
        maxDocuments: number;
    };
};
export declare class PlanGuard implements CanActivate {
    private reflector;
    private subs;
    constructor(reflector: Reflector, subs: Repository<Subscription>);
    canActivate(ctx: ExecutionContext): Promise<boolean>;
}
