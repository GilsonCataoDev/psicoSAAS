import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthGuard } from '@nestjs/passport'
import { PUBLIC_ROUTE_KEY } from '../decorators/public-route.decorator'
import { PlanAccessService } from '../plan-access/plan-access.service'

const GRACE_PERIOD_DAYS = 3

@Injectable()
export class SubscriptionGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly planAccess: PlanAccessService,
  ) {
    super()
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest()

    if (this.isPublicRoute(ctx) || this.isIgnoredPath(req.path)) {
      return true
    }

    await super.canActivate(ctx)

    const userId = req.user?.id
    if (!userId) throw new ForbiddenException('Plano inativo')

    const subscription = await this.planAccess.getLatestSubscription(userId)

    if (!subscription) return true
    if (subscription.status === 'active' || subscription.status === 'trialing') return true

    if (subscription.status === 'past_due' && this.isWithinGracePeriod(subscription.currentPeriodEnd)) {
      return true
    }

    // Conta sem plano pago ativo continua podendo usar os recursos do plano gratis.
    // Funcionalidades pagas ficam protegidas pelo PlanGuard/@RequirePlan.
    return true
  }

  private isPublicRoute(ctx: ExecutionContext): boolean {
    return this.reflector.getAllAndOverride<boolean>(
      PUBLIC_ROUTE_KEY,
      [ctx.getHandler(), ctx.getClass()],
    ) === true
  }

  private isIgnoredPath(path = ''): boolean {
    const normalizedPath = path.startsWith('/api/')
      ? path.replace(/^\/api/, '')
      : path

    return (
      normalizedPath.startsWith('/auth/') ||
      normalizedPath.startsWith('/public/') ||
      normalizedPath === '/billing/me' ||
      normalizedPath === '/billing/webhook' ||
      normalizedPath === '/billing/tokenize' ||
      normalizedPath === '/billing/update-card' ||
      normalizedPath === '/billing/subscribe' ||
      normalizedPath === '/billing/free' ||
      normalizedPath === '/billing/cancel' ||
      normalizedPath === '/data-export'
    )
  }

  private isWithinGracePeriod(currentPeriodEnd?: Date | null): boolean {
    if (!currentPeriodEnd) return false

    const graceEndsAt = new Date(currentPeriodEnd)
    graceEndsAt.setDate(graceEndsAt.getDate() + GRACE_PERIOD_DAYS)

    return new Date() <= graceEndsAt
  }
}
