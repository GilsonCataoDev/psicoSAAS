import {
  Injectable, CanActivate, ExecutionContext, ForbiddenException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PLAN_KEY, PlanLevel } from '../decorators/require-plan.decorator'
import { hasPlanAccess, PLAN_LIMITS } from '../plans'
import { PlanAccessService } from '../plan-access/plan-access.service'

export { PLAN_LIMITS }

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly planAccess: PlanAccessService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const requiredPlan = this.reflector.getAllAndOverride<PlanLevel>(
      PLAN_KEY, [ctx.getHandler(), ctx.getClass()],
    )
    if (!requiredPlan) return true

    const req = ctx.switchToHttp().getRequest()
    const userId = req.user?.id
    if (!userId) return false

    const currentPlan = await this.planAccess.getCurrentPlan(userId, req.user?.email)

    if (hasPlanAccess(currentPlan, requiredPlan)) return true

    throw new ForbiddenException({
      message: `Esta funcionalidade requer o plano ${requiredPlan} ou superior.`,
      requiredPlan,
      currentPlan,
      upgradeUrl: '/planos',
    })
  }
}
