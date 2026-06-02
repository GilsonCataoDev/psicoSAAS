import {
  Injectable, CanActivate, ExecutionContext, ForbiddenException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { PLAN_KEY, PlanLevel } from '../decorators/require-plan.decorator'
import { Subscription } from '../../modules/billing/entities/subscription.entity'
import { PLAN_LIMITS, normalizePlan } from '../plans'

const PLAN_ORDER: Record<PlanLevel, number> = { free: 0, basic: 1, essencial: 1, pro: 2, premium: 2 }
const COMPED_PRO_EMAILS = (process.env.COMPED_PRO_EMAILS ?? 'gilsonfilho96@outlook.com')
  .split(',')
  .map(email => email.trim().toLowerCase())
  .filter(Boolean)

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
    if (req.user?.email && COMPED_PRO_EMAILS.includes(String(req.user.email).toLowerCase())) return true

    const sub = await this.subs.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    })
    const currentPlan = normalizePlan(
      (sub?.status === 'active' || sub?.status === 'trialing') ? sub.plan : 'free',
    ) as PlanLevel

    if (PLAN_ORDER[currentPlan] >= PLAN_ORDER[requiredPlan]) return true

    throw new ForbiddenException({
      message: `Esta funcionalidade requer o plano ${requiredPlan} ou superior.`,
      requiredPlan,
      currentPlan,
      upgradeUrl: '/planos',
    })
  }
}
