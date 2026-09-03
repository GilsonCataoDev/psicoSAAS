import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from '../../modules/auth/entities/user.entity'
import { Subscription } from '../../modules/billing/entities/subscription.entity'
import {
  hasPlanAccess,
  KnownPlan,
  LATEST_SUBSCRIPTION_ORDER,
  resolveEffectivePlan,
} from '../plans'

@Injectable()
export class PlanAccessService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptions: Repository<Subscription>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  getLatestSubscription(userId: string): Promise<Subscription | null> {
    return this.subscriptions.findOne({
      where: { userId },
      order: LATEST_SUBSCRIPTION_ORDER,
    })
  }

  async getCurrentPlan(userId: string, knownEmail?: string | null): Promise<KnownPlan> {
    const [subscription, user] = await Promise.all([
      this.getLatestSubscription(userId),
      knownEmail
        ? Promise.resolve(null)
        : this.users.findOne({ where: { id: userId }, select: ['email'] }),
    ])

    return resolveEffectivePlan(subscription, knownEmail ?? user?.email)
  }

  async hasAccess(
    userId: string,
    requiredPlan: KnownPlan,
    knownEmail?: string | null,
  ): Promise<boolean> {
    return hasPlanAccess(
      await this.getCurrentPlan(userId, knownEmail),
      requiredPlan,
    )
  }
}
