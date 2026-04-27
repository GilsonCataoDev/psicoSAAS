export type PlanLevel = 'free' | 'essencial' | 'pro';
export declare const PLAN_KEY = "required_plan";
export declare const RequirePlan: (plan: PlanLevel) => import("@nestjs/common").CustomDecorator<string>;
