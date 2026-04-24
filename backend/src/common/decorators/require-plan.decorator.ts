import { SetMetadata } from '@nestjs/common'

export type PlanLevel = 'free' | 'essencial' | 'pro'

export const PLAN_KEY = 'required_plan'
export const RequirePlan = (plan: PlanLevel) => SetMetadata(PLAN_KEY, plan)
