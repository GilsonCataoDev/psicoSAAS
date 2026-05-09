type PlanLimits = Record<string, {
    maxPatients: number;
    maxDocuments: number;
}>;
export declare const PLAN_LIMITS: PlanLimits;
export type KnownPlan = keyof typeof PLAN_LIMITS;
export declare function normalizePlan(plan: string | null | undefined): KnownPlan;
export {};
