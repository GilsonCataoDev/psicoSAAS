export type PlanLevel = 'free' | 'basic' | 'essencial' | 'pro' | 'premium';
export declare const PLAN_KEY = "required_plan";
export declare const RequirePlan: (plan: PlanLevel) => import("@nestjs/common").CustomDecorator<string>;
