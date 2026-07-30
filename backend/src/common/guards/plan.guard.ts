import {
  Injectable, CanActivate, ExecutionContext, ForbiddenException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { PLAN_KEY, PlanLevel } from '../decorators/require-plan.decorator'
import { Subscription } from '../../modules/billing/entities/subscription.entity'
import {
  hasPlanAccess,
  LATEST_SUBSCRIPTION_ORDER,
  PLAN_LIMITS,
  resolveEffectivePlan,
} from '../plans'

export { PLAN_LIMITS }

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(Subscription) private subs: Repository<Subscription>,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const requiredPlan = this.reflector.getAllAndOverride<PlanLevel>(
      PLAN_KEY, [ctx.getHandler(), ctx.getClass()],
    )
    if (!requiredPlan) return true

    const req = ctx.switchToHttp().getRequest()
    const userId = req.user?.id
    if (!userId) return false

    const sub = await this.subs.findOne({
      where: { userId },
      order: LATEST_SUBSCRIPTION_ORDER,
    })
    const currentPlan = resolveEffectivePlan(sub, req.user?.email)

    if (hasPlanAccess(currentPlan, requiredPlan)) return true

    throw new ForbiddenException({
      message: `Esta funcionalidade requer o plano ${requiredPlan} ou superior.`,
      requiredPlan,
      currentPlan,
      upgradeUrl: '/planos',
    })
  }
}
