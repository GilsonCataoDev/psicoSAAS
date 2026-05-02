import {
  Injectable, CanActivate, ExecutionContext, ForbiddenException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { PLAN_KEY, PlanLevel } from '../decorators/require-plan.decorator'
import { Subscription } from '../../modules/billing/entities/subscription.entity'

const PLAN_ORDER: Record<PlanLevel, number> = { free: 0, basic: 1, essencial: 1, pro: 2, premium: 3 }

/** Limites por plano — única fonte da verdade no backend */
export const PLAN_LIMITS = {
  free:      { maxPatients: 2,  maxDocuments: 10 },
  basic:     { maxPatients: 30, maxDocuments: 200 },
  essencial: { maxPatients: 30, maxDocuments: 200 },
  pro:       { maxPatients: -1, maxDocuments: -1 }, // ilimitado
  premium:   { maxPatients: -1, maxDocuments: -1 },
}

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
    if (!requiredPlan) return true   // sem restrição

    const req = ctx.switchToHttp().getRequest()
    const userId = req.user?.id
    if (!userId) return false

    const sub = await this.subs.findOne({ where: { userId } })
    const currentPlan = (sub?.status === 'active' || sub?.status === 'trialing')
      ? (sub.plan as PlanLevel)
      : 'free'

    if (PLAN_ORDER[currentPlan] >= PLAN_ORDER[requiredPlan]) return true

    throw new ForbiddenException({
      message: `Esta funcionalidade requer o plano ${requiredPlan} ou superior.`,
      requiredPlan,
      currentPlan,
      upgradeUrl: '/planos',
    })
  }
}
