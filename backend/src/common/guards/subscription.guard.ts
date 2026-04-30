import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthGuard } from '@nestjs/passport'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { PUBLIC_ROUTE_KEY } from '../decorators/public-route.decorator'
import { Subscription } from '../../modules/billing/entities/subscription.entity'

const GRACE_PERIOD_DAYS = 3

@Injectable()
export class SubscriptionGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(Subscription)
    private readonly subscriptions: Repository<Subscription>,
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

    const subscription = await this.subscriptions.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    })

    if (!subscription) throw new ForbiddenException('Plano inativo')
    if (subscription.status === 'active' || subscription.status === 'trialing') return true

    if (subscription.status === 'past_due' && this.isWithinGracePeriod(subscription.currentPeriodEnd)) {
      return true
    }

    throw new ForbiddenException('Plano inativo')
  }

  private isPublicRoute(ctx: ExecutionContext): boolean {
    return this.reflector.getAllAndOverride<boolean>(
      PUBLIC_ROUTE_KEY,
      [ctx.getHandler(), ctx.getClass()],
    ) === true
  }

  private isIgnoredPath(path = ''): boolean {
    return (
      path.startsWith('/auth/') ||
      path.startsWith('/public/') ||
      path === '/billing/me' ||
      path === '/billing/webhook' ||
      path === '/billing/tokenize' ||
      path === '/billing/update-card' ||
      path === '/billing/subscribe'
    )
  }

  private isWithinGracePeriod(currentPeriodEnd?: Date | null): boolean {
    if (!currentPeriodEnd) return false

    const graceEndsAt = new Date(currentPeriodEnd)
    graceEndsAt.setDate(graceEndsAt.getDate() + GRACE_PERIOD_DAYS)

    return new Date() <= graceEndsAt
  }
}
