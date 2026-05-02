import { SetMetadata } from '@nestjs/common'

export type PlanLevel = 'free' | 'basic' | 'essencial' | 'pro' | 'premium'

export const PLAN_KEY = 'required_plan'
export const RequirePlan = (plan: PlanLevel) => SetMetadata(PLAN_KEY, plan)
